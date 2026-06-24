import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SuspendCampaignDto } from './dtos/suspend-campaign.dto';
import { RejectCampaignDto } from './dtos/reject-campaign.dto';
import { FileDisputeDto } from './dtos/file-dispute.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async suspendCampaign(
    campaignId: string,
    dto: SuspendCampaignDto,
    adminId: string,
    adminEmail: string,
  ): Promise<{ message: string }> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);
    if (campaign.status === 'SUSPENDED' as any)
      throw new BadRequestException('Campaign is already suspended');

    const previousStatus = campaign.status;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SUSPENDED' as any },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ADMIN_ACTION',
        resourceType: 'campaign',
        resourceId: campaignId,
        userId: adminId,
        details: JSON.stringify({ action: 'CAMPAIGN_SUSPENDED', reason: dto.reason, previousStatus }),
      },
    });

    await this.notificationsService.sendCampaignSuspensionEmail({
      toEmail: adminEmail,
      campaignId,
      campaignTitle: campaign.title,
      reason: dto.reason,
    });

    return { message: `Campaign ${campaignId} has been suspended` };
  }

  async approveCampaign(campaignId: string, adminId: string): Promise<{ message: string }> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);
    if (campaign.status !== 'PENDING_APPROVAL')
      throw new BadRequestException('Campaign is not pending review');

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ADMIN_ACTION',
        resourceType: 'campaign',
        resourceId: campaignId,
        userId: adminId,
        details: JSON.stringify({ action: 'CAMPAIGN_APPROVED' }),
      },
    });

    return { message: `Campaign ${campaignId} approved and set to ACTIVE` };
  }

  async rejectCampaign(
    campaignId: string,
    dto: RejectCampaignDto,
    adminId: string,
  ): Promise<{ message: string }> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);
    if (campaign.status !== 'PENDING_APPROVAL')
      throw new BadRequestException('Campaign is not pending review');

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'REJECTED' },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ADMIN_ACTION',
        resourceType: 'campaign',
        resourceId: campaignId,
        userId: adminId,
        details: JSON.stringify({ action: 'CAMPAIGN_REJECTED', reason: dto.reason }),
      },
    });

    return { message: `Campaign ${campaignId} has been rejected` };
  }

  async getPlatformStats(range: '7d' | '30d' | '90d' | 'all') {
    const since = rangeToDate(range);
    const dateFilter = since ? { gte: since } : undefined;

    const [totalUsers, totalCampaigns, donationAgg, activeCampaigns, totalContracts] =
      await Promise.all([
        this.prisma.user.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
        this.prisma.campaign.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
        this.prisma.donation.aggregate({
          where: {
            status: 'CONFIRMED',
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        this.prisma.smartContract.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
      ]);

    return {
      totalUsers,
      totalCampaigns,
      totalDonations: donationAgg._count,
      totalVolumeXLM: donationAgg._sum.amount?.toString() ?? '0',
      activeCampaigns,
      totalContractsDeployed: totalContracts,
    };
  }

  async getAuditLog(
    page: number,
    limit: number,
    action?: string,
    adminId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (action) where.action = action;
    if (adminId) where.userId = adminId;

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, walletAddress: true, role: true } } },
      }),
    ]);

    return { data: entries, total, page, limit };
  }

  async fileDispute(userId: string, dto: FileDisputeDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: dto.campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const existingDonation = await this.prisma.donation.findFirst({
      where: { donorId: userId, campaignId: dto.campaignId, status: 'CONFIRMED' },
    });
    if (!existingDonation) throw new BadRequestException('No confirmed donation found for this campaign');

    const existing = await this.prisma.dispute.findFirst({
      where: { filerId: userId, campaignId: dto.campaignId },
    });
    if (existing) throw new ConflictException('You have already filed a dispute for this campaign');

    const dispute = await this.prisma.dispute.create({
      data: {
        donationId: existingDonation.id,
        filerId: userId,
        campaignId: dto.campaignId,
        reason: dto.reason,
        description: dto.description,
        status: 'OPENED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DISPUTE_FILED',
        resourceType: 'dispute',
        resourceId: dispute.id,
        userId,
        details: JSON.stringify({ campaignId: dto.campaignId, reason: dto.reason }),
      },
    });

    return dispute;
  }
}

function rangeToDate(range: '7d' | '30d' | '90d' | 'all'): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
