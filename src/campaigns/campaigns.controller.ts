import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import Keyv from 'keyv';
import { CampaignsService } from './campaigns.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Body } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';

const FORBIDDEN_FIELDS = [
  'goalAmount',
  'contractId',
  'acceptedAssets',
  'milestones',
  'endDate',
];
import { BrowseCampaignsQueryDto, BrowseCampaignsResponseDto } from './dto/browse-campaigns.dto';

const CACHE_MANAGER = 'CACHE_MANAGER';

@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    @Inject(CACHE_MANAGER) private cacheManager: Keyv,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: CreateCampaignDto,
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user?.sub as string;
    return this.campaignsService.createCampaign(userId, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCampaignDto,
    @Req() req: Request & { user: any },
  ) {
    // Reject attempts to update forbidden fields
    const sentKeys = Object.keys(body || {});
    const illegal = sentKeys.filter((k) => FORBIDDEN_FIELDS.includes(k));
    if (illegal.length > 0) {
      throw new BadRequestException(
        `Cannot update protected fields: ${illegal.join(', ')}`,
      );
    }

    const userId = req.user?.sub as string;
    return this.campaignsService.updateCampaign(userId, id, body);
  }

  /**
   * GET /campaigns
   * Browse public campaigns with pagination, filtering, and sorting
   * Query params: page, limit, category, status, search, sortBy
   * Cached for 30 seconds
   */
  @Get()
  async browseCampaigns(
    @Query() query: BrowseCampaignsQueryDto,
  ): Promise<BrowseCampaignsResponseDto> {
    // Generate cache key based on query parameters
    const cacheKey = this.generateCacheKey(query);

    // Try to get from cache
    const cached =
      (await this.cacheManager.get(cacheKey)) as BrowseCampaignsResponseDto | undefined;
    if (cached) {
      return cached;
    }

    // If not cached, fetch from service
    const result = await this.campaignsService.browseCampaigns(query);

    // Cache the result for 30 seconds
    await this.cacheManager.set(cacheKey, result, 30000);

    return result;
  }

  @Get('featured')
  async featured() {
    return this.campaignsService.getFeaturedCampaigns();
  }

  /**
   * Generate a cache key based on query parameters
   */
  private generateCacheKey(query: BrowseCampaignsQueryDto): string {
    const parts = [
      'campaigns',
      `page:${query.page}`,
      `limit:${query.limit}`,
      `sortBy:${query.sortBy}`,
    ];

    if (query.category) {
      parts.push(`category:${query.category}`);
    }

    if (query.status) {
      parts.push(`status:${query.status}`);
    }

    if (query.search) {
      parts.push(`search:${query.search}`);
    }

    return parts.join(':');
  }
}

@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post(':id/feature')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async feature(@Param('id') id: string) {
    return this.campaignsService.featureCampaign(id);
  }
}
