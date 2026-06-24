import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, AuditLog]),
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
