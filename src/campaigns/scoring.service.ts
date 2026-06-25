import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsScoringService {
  private readonly logger = new Logger(CampaignsScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recalculatePerformanceScores() {
    this.logger.log('Starting daily campaign performance scoring...');

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: { not: 'DRAFT' }
      },
      include: {
        _count: {
          select: { updates: true }
        }
      }
    });

    for (const campaign of campaigns) {
      const raisedAmount = Number(campaign.raisedAmount) || 0;
      const updateCount = campaign._count.updates;
      const shareCount = campaign.shareCount || 0;
      
      const daysActive = Math.max(1, Math.floor((Date.now() - campaign.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

      const uniqueDonors = await this.prisma.donation.groupBy({
        by: ['donorId'],
        where: { campaignId: campaign.id, status: 'CONFIRMED' }
      });
      const donorCount = uniqueDonors.length;

      // Score = f(raisedAmount, donorCount, daysActive, updateCount, shareCount)
      const baseScore = (raisedAmount * 0.01) + (donorCount * 10) + (updateCount * 5) + (shareCount * 2);
      const score = baseScore / Math.sqrt(daysActive);

      await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { performanceScore: score }
      });
    }

    this.logger.log('Finished daily campaign performance scoring.');
  }
}
