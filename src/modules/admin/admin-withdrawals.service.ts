import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WithdrawalStatus } from '../../../../generated/prisma';
import { ListWithdrawalsQueryDto } from './dto/list-withdrawals-query.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';
import { EmailService } from '../users/email.service';
import { StellarPayoutService } from '../withdrawals/services/stellar-payout.service';

@Injectable()
export class AdminWithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly stellarPayoutService: StellarPayoutService,
  ) {}

  async listWithdrawals(query: ListWithdrawalsQueryDto) {
    const { search, status, projectId, creatorId, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (creatorId) where.creatorId = creatorId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search) {
      where.OR = [
        { project: { title: { contains: search, mode: 'insensitive' } } },
        { creator: { firstName: { contains: search, mode: 'insensitive' } } },
        { creator: { lastName: { contains: search, mode: 'insensitive' } } },
        { creator: { email: { contains: search, mode: 'insensitive' } } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [withdrawals, total] = await this.prisma.$transaction([
      this.prisma.withdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, title: true, imageUrl: true }
          },
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return { data: withdrawals, total, page, limit };
  }

  async getWithdrawal(id: string) {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: { id },
      include: {
        project: {
          select: { id: true, title: true, description: true, imageUrl: true, goalAmount: true, raisedAmount: true }
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true, walletAddress: true }
        }
      },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    return withdrawal;
  }

  async processWithdrawal(id: string, adminId: string, dto: ProcessWithdrawalDto) {
    if (dto.status === WithdrawalStatus.REJECTED) {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required when rejecting a withdrawal');
      }

      return this.rejectWithdrawal(id, adminId, dto.rejectionReason);
    }

    if (dto.status === WithdrawalStatus.APPROVED || dto.status === WithdrawalStatus.COMPLETED) {
      return this.approveWithdrawal(id, adminId);
    }

    throw new BadRequestException('Unsupported withdrawal status transition');
  }

  async approveWithdrawal(id: string, adminId: string) {
    const approved = await this.transitionFromPending(id, {
      status: WithdrawalStatus.APPROVED,
      processedBy: adminId,
      processedAt: new Date(),
      rejectionReason: null,
    });

    try {
      const payout = await this.stellarPayoutService.sendPayout({
        amount: String(approved.amount),
        assetCode: approved.assetCode,
        assetIssuer: approved.assetIssuer,
        destinationAddress: approved.walletAddress,
      });

      const completed = await this.prisma.withdrawal.update({
        where: { id: approved.id },
        data: {
          status: WithdrawalStatus.COMPLETED,
          transactionHash: payout.transactionHash,
        },
        include: {
          project: { select: { id: true, title: true } },
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      await this.emailService.sendWithdrawalApprovedEmail(
        completed.creator.email,
        completed.project.title,
        String(completed.amount),
        completed.transactionHash ?? undefined,
      );

      return {
        message: 'Withdrawal approved and payout completed successfully',
        withdrawal: completed,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown payout error';
      const failureReason = `Payout failed: ${reason}`;

      await this.prisma.withdrawal.update({
        where: { id: approved.id },
        data: {
          status: WithdrawalStatus.FAILED,
          rejectionReason: failureReason,
        },
      });

      await this.emailService.sendWithdrawalRejectedEmail(
        approved.creator.email,
        approved.project.title,
        String(approved.amount),
        failureReason,
      );

      throw new BadRequestException(`Withdrawal approval failed during payout: ${reason}`);
    }
  }

  async rejectWithdrawal(id: string, adminId: string, rejectionReason: string) {
    const rejected = await this.transitionFromPending(id, {
      status: WithdrawalStatus.REJECTED,
      processedBy: adminId,
      processedAt: new Date(),
      rejectionReason,
    });

    await this.emailService.sendWithdrawalRejectedEmail(
      rejected.creator.email,
      rejected.project.title,
      String(rejected.amount),
      rejectionReason,
    );

    return {
      message: 'Withdrawal rejected successfully',
      withdrawal: rejected,
    };
  }

  async getWithdrawalStats() {
    const [pending, approved, rejected, completed, failed, total] = await Promise.all([
      this.prisma.withdrawal.count({ where: { status: WithdrawalStatus.PENDING } }),
      this.prisma.withdrawal.count({ where: { status: WithdrawalStatus.APPROVED } }),
      this.prisma.withdrawal.count({ where: { status: WithdrawalStatus.REJECTED } }),
      this.prisma.withdrawal.count({ where: { status: WithdrawalStatus.COMPLETED } }),
      this.prisma.withdrawal.count({ where: { status: WithdrawalStatus.FAILED } }),
      this.prisma.withdrawal.count(),
    ]);

    const totalAmount = await this.prisma.withdrawal.aggregate({
      _sum: { amount: true },
      where: { status: { in: [WithdrawalStatus.APPROVED, WithdrawalStatus.COMPLETED] } }
    });

    return {
      pending,
      approved,
      rejected,
      completed,
      failed,
      total,
      totalProcessedAmount: totalAmount._sum.amount || 0,
    };
  }

  private async transitionFromPending(
    id: string,
    data: {
      status: WithdrawalStatus;
      processedBy: string;
      processedAt: Date;
      rejectionReason?: string | null;
    },
  ) {
    const updated = await this.prisma.withdrawal.updateMany({
      where: {
        id,
        status: WithdrawalStatus.PENDING,
      },
      data,
    });

    if (updated.count === 0) {
      const existing = await this.prisma.withdrawal.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!existing) {
        throw new NotFoundException('Withdrawal not found');
      }

      throw new BadRequestException('Withdrawal can only be processed if it is pending');
    }

    return this.prisma.withdrawal.findUniqueOrThrow({
      where: { id },
      include: {
        project: { select: { id: true, title: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
