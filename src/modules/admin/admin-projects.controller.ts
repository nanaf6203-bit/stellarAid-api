import { Controller, Patch, Param, Body, UseGuards, Get } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { ApproveProjectDto } from './dto/approve-project.dto';
import { RejectProjectDto } from './dto/reject-project.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/types/user-role.enum';

interface JwtUser {
  id: string;
  role: UserRole;
}

@Controller('admin/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('pending')
  getPendingProjects() {
    return this.projectsService.findAll(); // TODO: Filter by PENDING status
  }

  @Patch(':id/approve')
  approveProject(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: ApproveProjectDto,
  ) {
    return this.projectsService.approveProject(id, user.id, dto.remarks);
  }

  @Patch(':id/reject')
  rejectProject(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: RejectProjectDto,
  ) {
    return this.projectsService.rejectProject(id, user.id, dto.reason);
  }
}
