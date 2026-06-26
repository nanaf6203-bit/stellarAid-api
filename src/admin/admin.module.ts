import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminService } from './admin.service';
import { AdminController, DisputesController } from './admin.controller';
import { AdminEmailScheduler } from './admin-email.scheduler';

@Module({
  controllers: [AdminController, DisputesController],
  imports: [PrismaModule, NotificationsModule],
  providers: [AdminService, AdminEmailScheduler],
})
export class AdminModule {}