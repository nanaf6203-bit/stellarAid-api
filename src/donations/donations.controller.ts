import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationsService } from './donations.service.js';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateDonationDto,
    @Req() req: Request & { user: any },
  ) {
    const walletAddress = String(req.user?.walletAddress ?? '');
    return this.donationsService.createDonation(walletAddress, dto);
  }
}
