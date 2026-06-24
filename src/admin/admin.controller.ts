import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { SuspendCampaignDto } from './dtos/suspend-campaign.dto';
import { SuspendUserDto } from './dtos/suspend-user.dto';
import { ListDisputesDto } from './dtos/list-disputes.dto';
import { ResolveDisputeDto } from './dtos/resolve-dispute.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('campaigns/:id/suspend')
  suspendCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendCampaignDto,
    @Request() req,
  ) {
    return this.adminService.suspendCampaign(id, dto, req.user.sub, req.user.email);
  }

  // ── Issue #308 ───────────────────────────────────────────────────────────

  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @Request() req,
  ) {
    return this.adminService.suspendUser(id, dto, req.user.sub);
  }

  @Patch('users/:id/unsuspend')
  unsuspendUser(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.adminService.unsuspendUser(id, req.user.sub);
  }

  // ── Issue #303 ───────────────────────────────────────────────────────────

  @Get('disputes')
  listDisputes(@Query() query: ListDisputesDto) {
    return this.adminService.listDisputes(query);
  }

  // ── Issue #304 ───────────────────────────────────────────────────────────

  @Patch('disputes/:id')
  resolveDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
    @Request() req,
  ) {
    return this.adminService.resolveDispute(id, dto, req.user.sub);
  }
}
