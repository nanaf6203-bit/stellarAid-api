import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminService } from './admin.service';
import { AdminController, DisputesController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [AdminController, DisputesController],
  imports: [
    TypeOrmModule.forFeature([Campaign, AuditLog]),
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
