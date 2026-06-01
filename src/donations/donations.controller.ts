import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationResponseDto, PlatformTipResponseDto } from './dto/donation.dto';
import { Request as ExpressRequest } from 'express';

@Controller('donations')
@UseGuards(JwtAuthGuard)
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  async createDonation(
    @Request() req: ExpressRequest & { user: any },
    @Body() dto: CreateDonationDto,
  ): Promise<{ donation: DonationResponseDto; tip: PlatformTipResponseDto | null }> {
    const userId = req.user?.sub as string;
    return this.donationsService.createDonation(userId, dto);
  }

  @Get('me')
  async getMyDonations(
    @Request() req: ExpressRequest & { user: any },
  ) {
    const userId = req.user?.sub as string;
    return this.donationsService.findAll(userId);
  }

  @Get(':id')
  async getDonation(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: any },
  ) {
    const userId = req.user?.sub as string;
    return this.donationsService.findById(id, userId);
  }

  @Post(':txHash/verify')
  async verifyDonation(
    @Param('txHash') txHash: string,
  ): Promise<{ verified: boolean; status: string }> {
    const verified = await this.donationsService.verifyDonationOnChain(txHash);

    if (!verified) {
      const tipVerified = await this.donationsService.verifyTipOnChain(txHash);

      return {
        verified: tipVerified,
        status: tipVerified ? 'CONFIRMED' : 'PENDING',
      };
    }

    return {
      verified: true,
      status: 'CONFIRMED',
    };
  }

  @Get('admin/tips/revenue')
  async getTipRevenue(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return this.donationsService.getTipRevenue();
  }

  @Get('admin/tips')
  async getAllTips(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return this.donationsService.getAllTips();
  }
}

import { ForbiddenException } from '@nestjs/common';
