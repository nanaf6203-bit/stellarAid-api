import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StellarModule } from '../stellar/stellar.module';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [PrismaModule, AuthModule, StellarModule, CampaignsModule],
  controllers: [DonationsController],
  providers: [DonationsService, JwtAuthGuard],
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { AdminTipsController } from './admin-tips.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DonationsController, AdminTipsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
