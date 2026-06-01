import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignsService } from '../campaigns/campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  StellarAcceptedAsset,
  StellarTransactionsService,
} from '../stellar/stellar-transactions.service.js';
import { CreateDonationDto } from './dto/create-donation.dto';

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
    private readonly stellarTxs: StellarTransactionsService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async createDonation(walletAddress: string, dto: CreateDonationDto) {
    if (!walletAddress) {
      throw new BadRequestException('Missing walletAddress in token');
    }

    const existing = await this.db.donation.findUnique({
      where: { txHash: dto.txHash },
    });
    if (existing) {
      return existing;
    }

    const campaign = await this.db.campaign.findUnique({
      where: { id: dto.campaignId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (!campaign.contractId) {
      throw new BadRequestException('Campaign contractId is not set');
    }

    const requestedAsset = parseAsset(dto.assetCode, dto.assetIssuer);
    const acceptedAssets = coerceAcceptedAssets(campaign.acceptedAssets);

    await this.stellarTxs.verifyDonationTransaction({
      txHash: dto.txHash,
      destination: campaign.contractId,
      amount: dto.amount,
      asset: requestedAsset,
      acceptedAssets,
    });

    const donor = await this.getOrCreateUserByWallet(walletAddress);

    const created = await this.db.donation.create({
      data: {
        donorId: donor.id,
        campaignId: campaign.id,
        amount: dto.amount,
        assetCode: dto.assetCode.toUpperCase(),
        assetIssuer: requestedAsset.assetType === 'credit' ? requestedAsset.issuer : null,
        txHash: dto.txHash,
        isAnonymous: dto.isAnonymous ?? false,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        donatedAt: new Date(),
      },
    });

    await this.campaigns.recalculateCampaignStats(campaign.id);

    return created;
  }

  private async getOrCreateUserByWallet(walletAddress: string) {
    const existing = await this.db.user.findUnique({
      where: { walletAddress },
    });
    if (existing) return existing;

    return this.db.user.create({
      data: {
        walletAddress,
        email: `${walletAddress}@stellaraid.local`,
        role: 'DONOR',
      },
    });
  }
}

function parseAsset(assetCode: string, assetIssuer?: string): StellarAcceptedAsset {
  const code = String(assetCode ?? '').trim();
  if (!code) {
    throw new BadRequestException('assetCode is required');
  }

  if (code.toUpperCase() === 'XLM') {
    return { assetType: 'native' };
  }

  const issuer = String(assetIssuer ?? '').trim();
  if (!issuer) {
    throw new BadRequestException('assetIssuer is required for non-native assets');
  }

  return { assetType: 'credit', code, issuer };
}

function coerceAcceptedAssets(value: unknown): StellarAcceptedAsset[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ assetType: 'native' }];
  }

  const parsed: StellarAcceptedAsset[] = [];
  for (const item of value) {
    if (item && typeof item === 'object') {
      const assetType = (item as any).assetType;
      if (assetType === 'native') {
        parsed.push({ assetType: 'native' });
        continue;
      }
      if (assetType === 'credit') {
        const code = String((item as any).code ?? '');
        const issuer = String((item as any).issuer ?? '');
        if (code && issuer) {
          parsed.push({ assetType: 'credit', code, issuer });
        }
      }
    }
  }

  return parsed.length > 0 ? parsed : [{ assetType: 'native' }];
}
