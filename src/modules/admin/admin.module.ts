import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminProjectsController } from './admin-projects.controller';
import { AdminWithdrawalsController } from './admin-withdrawals.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminWithdrawalsService } from './admin-withdrawals.service';
import { PrismaModule } from '../../database/prisma.module';
import { EmailService } from '../users/email.service';
import { ProjectsModule } from '../projects/projects.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';

@Module({
  imports: [PrismaModule, ProjectsModule, WithdrawalsModule],
  controllers: [AdminUsersController, AdminProjectsController, AdminWithdrawalsController],
  providers: [AdminUsersService, AdminWithdrawalsService, EmailService],
})
export class AdminModule {}
