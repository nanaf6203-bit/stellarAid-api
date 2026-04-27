import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus, UserRole, UserStatus, WithdrawalStatus } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../users/email.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async requestWithdrawal(creatorId: string, dto: RequestWithdrawalDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: {
        id: true,
        title: true,
        creatorId: true,
        status: true,
        raisedAmount: true,
        creator: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.creatorId !== creatorId) {
      throw new ForbiddenException('You can only request withdrawals for your own projects');
    }

    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException('Withdrawals are only allowed for completed projects');
    }

    const withdrawalTotals = await this.prisma.withdrawal.aggregate({
      where: {
        projectId: project.id,
        status: {
          in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.COMPLETED],
        },
      },
      _sum: { amount: true },
    });

    const raisedAmount = Number(project.raisedAmount || 0);
    const committedAmount = Number(withdrawalTotals._sum.amount || 0);
    const availableAmount = raisedAmount - committedAmount;

    if (dto.amount > availableAmount) {
      throw new BadRequestException(
        `Insufficient available funds. Requested ${dto.amount}, available ${availableAmount.toFixed(7)}`,
      );
    }

    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        projectId: project.id,
        creatorId,
        amount: dto.amount,
        walletAddress: dto.walletAddress,
        assetCode: dto.assetCode || 'XLM',
        assetIssuer: dto.assetIssuer,
        status: WithdrawalStatus.PENDING,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: {
        email: true,
      },
    });

    await Promise.all(
      admins
        .filter((admin) => !!admin.email)
        .map((admin) =>
          this.emailService.sendWithdrawalRequestSubmittedToAdmin(
            admin.email,
            project.title,
            String(withdrawal.amount),
            project.creator.email,
          ),
        ),
    );

    return withdrawal;
  }
}
