import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [ConfigModule],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
