import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { DonationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfileDto, PublicUserProfileDto } from './dto/user-profile.dto';
import {
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';
import { QUEUE_EXPORT } from '../queue/queue.constants';
import type { ExportDonationJobData } from './export.processor';

const EXPORT_QUEUE_THRESHOLD = 500;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_EXPORT) private readonly exportQueue: Queue,
  ) {}

  async getMyProfile(walletAddress: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
      include: {
        campaigns: { where: { status: 'ACTIVE' } },
        donations: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const totalRaised = user.campaigns.reduce(
      (sum, c) => sum + parseFloat(c.raisedAmount.toString()), 0,
    );
    const totalDonated = user.donations.reduce(
      (sum, d) => sum + parseFloat(d.amount.toString()), 0,
    );

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName || undefined,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
      role: user.role,
      kycStatus: user.kycStatus,
      verifiedStatus: user.kycStatus === 'VERIFIED',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalRaised,
      totalDonated,
      campaignCount: user.campaigns.length,
    };
  }

  async updateMyProfile(walletAddress: string, updateDto: UpdateUserDto): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { walletAddress } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: updateDto.displayName ?? user.displayName,
        bio: updateDto.bio ?? user.bio,
        avatarUrl: updateDto.avatarUrl ?? user.avatarUrl,
        socialLinks: (updateDto.socialLinks ?? user.socialLinks) as any,
      },
      include: {
        campaigns: { where: { status: 'ACTIVE' } },
        donations: true,
      },
    });

    const totalRaised = updated.campaigns.reduce(
      (sum, c) => sum + parseFloat(c.raisedAmount.toString()), 0,
    );
    const totalDonated = updated.donations.reduce(
      (sum, d) => sum + parseFloat(d.amount.toString()), 0,
    );

    return {
      id: updated.id,
      walletAddress: updated.walletAddress,
      displayName: updated.displayName || undefined,
      bio: updated.bio || undefined,
      avatarUrl: updated.avatarUrl || undefined,
      role: updated.role,
      kycStatus: updated.kycStatus,
      verifiedStatus: updated.kycStatus === 'VERIFIED',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      totalRaised,
      totalDonated,
      campaignCount: updated.campaigns.length,
    };
  }

  async getPublicProfile(walletAddress: string): Promise<PublicUserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
      include: { campaigns: { where: { status: 'ACTIVE' } } },
    });
    if (!user) throw new NotFoundException(`User with wallet address ${walletAddress} not found`);

    const totalRaised = user.campaigns.reduce(
      (sum, c) => sum + parseFloat(c.raisedAmount.toString()), 0,
    );

    return {
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      bio: user.bio || undefined,
      verifiedStatus: user.kycStatus === 'VERIFIED',
      campaignCount: user.campaigns.length,
      totalRaised,
    };
  }

  async updateKYCStatus(
    userId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id: userId }, data: { kycStatus: status } });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_ACTION',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({ action: 'KYC_STATUS_UPDATE', previousStatus: user.kycStatus, newStatus: status }),
      },
    });

    return { success: true, message: `User KYC status updated to ${status}` };
  }

  async getOrCreateUser(walletAddress: string, email?: string) {
    let user = await this.prisma.user.findUnique({ where: { walletAddress } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { walletAddress, email: email || `${walletAddress}@stellaraid.local`, role: 'DONOR' },
      });
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_CREATED',
          resourceType: 'User',
          resourceId: user.id,
          details: JSON.stringify({ walletAddress }),
        },
      });
    }
    return user;
  }

  async getUserDonationHistory(
    userId: string,
    page = 1,
    limit = 20,
    sortBy: 'amount' | 'createdAt' = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
    campaignId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { donorId: userId, status: DonationStatus.CONFIRMED };
    if (campaignId) where.campaignId = campaignId;
    if (startDate || endDate) {
      where.donatedAt = {};
      if (startDate) where.donatedAt.gte = new Date(startDate);
      if (endDate) where.donatedAt.lte = new Date(endDate);
    }

    const orderByClause: Record<string, string> = { [sortBy]: order };

    const total = await this.prisma.donation.count({ where });
    const donations = await this.prisma.donation.findMany({
      where,
      include: { campaign: { select: { id: true, title: true, status: true } } },
      orderBy: orderByClause,
      skip,
      take: limit,
    });

    const donationHistory = donations.map((d) => ({
      id: d.id,
      amount: d.amount.toString(),
      assetCode: d.assetCode,
      status: d.status,
      campaignId: d.campaignId,
      campaignTitle: d.campaign?.title || 'Unknown Campaign',
      campaignStatus: d.campaign?.status || 'UNKNOWN',
      txHash: d.txHash,
      donatedAt: d.donatedAt,
      createdAt: d.createdAt,
    }));

    const agg = await this.prisma.donation.aggregate({ where, _sum: { amount: true }, _count: { _all: true } });
    const totalDonated = agg._sum.amount?.toString() || '0';
    const totalDonations = agg._count._all;
    const averageDonation = totalDonations > 0 ? (parseFloat(totalDonated) / totalDonations).toString() : '0';

    return {
      donations: donationHistory,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: { totalDonated, totalDonations, averageDonation },
    };
  }

  async exportUserDonationsAsCSV(
    userId: string,
    campaignId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ csv?: string; jobId?: string; queued: boolean }> {
    const where: any = { donorId: userId, status: DonationStatus.CONFIRMED };
    if (campaignId) where.campaignId = campaignId;
    if (startDate || endDate) {
      where.donatedAt = {};
      if (startDate) where.donatedAt.gte = new Date(startDate);
      if (endDate) where.donatedAt.lte = new Date(endDate);
    }

    const count = await this.prisma.donation.count({ where });

    if (count > EXPORT_QUEUE_THRESHOLD) {
      const jobData: ExportDonationJobData = { userId, campaignId, startDate, endDate };
      const job = await this.exportQueue.add('donation-export', jobData);
      return { queued: true, jobId: String(job.id) };
    }

    const donations = await this.prisma.donation.findMany({
      where,
      include: { campaign: { select: { title: true } } },
      orderBy: { donatedAt: 'desc' },
    });

    const headers = ['Campaign', 'Amount', 'Asset', 'Date', 'Tx Hash', 'USD Equivalent'];
    const rows: string[] = [headers.map((h) => `"${h}"`).join(',')];
    for (const d of donations) {
      rows.push([
        `"${(d.campaign?.title || 'Unknown').replace(/"/g, '""')}"`,
        d.amount.toString(),
        d.assetCode,
        d.donatedAt.toISOString().split('T')[0],
        `"${d.txHash || ''}"`,
        '0.00',
      ].join(','));
    }
    return { csv: rows.join('\n'), queued: false };
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { notificationPreference: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!user.notificationPreference) {
      return {
        donationReceived: { email: true, inApp: true },
        milestoneUnlocked: { email: true, inApp: true },
        campaignUpdate: { email: true, inApp: true },
        campaignCreated: { email: true, inApp: true },
        campaignCompleted: { email: true, inApp: true },
      };
    }
    return user.notificationPreference.preferences as unknown as NotificationPreferencesDto;
  }

  async updateNotificationPreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { notificationPreference: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = (user.notificationPreference?.preferences || {}) as Record<string, any>;
    const defaults = {
      donationReceived: { email: true, inApp: true },
      milestoneUnlocked: { email: true, inApp: true },
      campaignUpdate: { email: true, inApp: true },
      campaignCreated: { email: true, inApp: true },
      campaignCompleted: { email: true, inApp: true },
    };
    const merged: Record<string, any> = { ...defaults, ...existing };
    for (const [key, value] of Object.entries(updateDto)) {
      if (value !== undefined) merged[key] = { ...merged[key], ...value };
    }

    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: { preferences: merged },
      create: { userId, preferences: merged },
    });
    return prefs.preferences as unknown as NotificationPreferencesDto;
  }

  async getExportJobStatus(jobId: string): Promise<{ status: string; csv?: string; rowCount?: number }> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Export job ${jobId} not found`);
    const state = await job.getState();
    if (state === 'completed') {
      const result = job.returnvalue as { csv: string; rowCount: number };
      return { status: 'completed', csv: result.csv, rowCount: result.rowCount };
    }
    if (state === 'failed') return { status: 'failed' };
    return { status: state };
  }
}
