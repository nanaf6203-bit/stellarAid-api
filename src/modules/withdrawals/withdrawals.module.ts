import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { EmailService } from '../users/email.service';
import { StellarPayoutService } from './services/stellar-payout.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  imports: [PrismaModule],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, StellarPayoutService, EmailService],
  exports: [StellarPayoutService, WithdrawalsService],
})
export class WithdrawalsModule {}
