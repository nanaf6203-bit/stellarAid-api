import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from '../campaigns/entities/campaign.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SuspendCampaignDto } from './dtos/suspend-campaign.dto';
import { SuspendUserDto } from './dtos/suspend-user.dto';
import { ListDisputesDto } from './dtos/list-disputes.dto';
import { ResolveDisputeDto } from './dtos/resolve-dispute.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Issue #308: suspend user ──────────────────────────────────────────────

  async suspendUser(
    userId: string,
    dto: SuspendUserDto,
    adminId: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.isSuspended) throw new BadRequestException('User is already suspended');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: true, suspensionReason: dto.reason, isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_SUSPENDED',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({ reason: dto.reason }),
      },
    });

    if (user.email) {
      await this.notificationsService.sendUserSuspensionEmail(user.email, true, dto.reason);
    }

    return { message: `User ${userId} has been suspended` };
  }

  async unsuspendUser(userId: string, adminId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!user.isSuspended) throw new BadRequestException('User is not suspended');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: false, suspensionReason: null, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_UNSUSPENDED',
        resourceType: 'User',
        resourceId: userId,
        details: null,
      },
    });

    if (user.email) {
      await this.notificationsService.sendUserSuspensionEmail(user.email, false);
    }

    return { message: `User ${userId} has been unsuspended` };
  }

  // ── Issue #303: list disputes ─────────────────────────────────────────────

  async listDisputes(dto: ListDisputesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = dto.status ? { status: dto.status as any } : {};

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          filer: { select: { id: true, walletAddress: true, email: true, displayName: true } },
          campaign: { select: { id: true, title: true } },
          donation: { select: { id: true, txHash: true, amount: true, assetCode: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── Issue #304: resolve dispute ───────────────────────────────────────────

  async resolveDispute(
    disputeId: string,
    dto: ResolveDisputeDto,
    adminId: string,
  ): Promise<{ message: string }> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        filer: { select: { email: true } },
        campaign: { select: { creatorId: true } },
      },
    });
    if (!dispute) throw new NotFoundException(`Dispute ${disputeId} not found`);
    if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
      throw new BadRequestException(`Dispute is already ${dispute.status.toLowerCase()}`);
    }

    const isTerminal = dto.status === 'RESOLVED' || dto.status === 'REJECTED';
    if (isTerminal && !dto.resolution) {
      throw new BadRequestException('Resolution note is required when resolving or rejecting');
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolution: dto.resolution ?? undefined,
        resolvedAt: isTerminal ? new Date() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DISPUTE_RESOLVED',
        resourceType: 'Dispute',
        resourceId: disputeId,
        details: JSON.stringify({ status: dto.status, resolution: dto.resolution }),
      },
    });

    // Notify filer
    if (dispute.filer?.email) {
      await this.notificationsService.sendDisputeResolutionEmail(
        dispute.filer.email,
        disputeId,
        dto.status,
        dto.resolution,
      );
    }

    // Notify campaign creator if terminal
    if (isTerminal && dispute.campaign?.creatorId) {
      const creator = await this.prisma.user.findUnique({
        where: { id: dispute.campaign.creatorId },
        select: { email: true },
      });
      if (creator?.email) {
        await this.notificationsService.sendDisputeResolutionEmail(
          creator.email,
          disputeId,
          dto.status,
          dto.resolution,
        );
      }
    }

    return { message: `Dispute ${disputeId} updated to ${dto.status}` };
  }

  // ── Existing: suspend campaign ────────────────────────────────────────────

  async suspendCampaign(
    campaignId: string,
    dto: SuspendCampaignDto,
    adminId: string,
    adminEmail: string,
  ): Promise<{ message: string }> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);
    if (campaign.status === CampaignStatus.SUSPENDED) {
      throw new BadRequestException('Campaign is already suspended');
    }

    const previousStatus = campaign.status;
    campaign.status = CampaignStatus.SUSPENDED;
    campaign.suspensionReason = dto.reason;
    await this.campaignRepo.save(campaign);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        action: 'CAMPAIGN_SUSPENDED',
        actorId: adminId,
        targetType: 'campaign',
        targetId: campaignId,
        metadata: { reason: dto.reason, previousStatus },
      }),
    );

    await this.notificationsService.sendCampaignSuspensionEmail({
      toEmail: `creator-${campaign.creatorId}@platform.internal`,
      campaignId,
      campaignTitle: campaign.title,
      reason: dto.reason,
    });

    return { message: `Campaign ${campaignId} has been suspended` };
  }
}
