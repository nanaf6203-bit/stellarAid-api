import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  campaign: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  platformTip: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('DonationsService', () => {
  let service: DonationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DonationsService>(DonationsService);
    jest.clearAllMocks();
  });

  describe('createDonation', () => {
    const activeCampaign = {
      id: 'camp-1',
      status: 'ACTIVE',
      raisedAmount: 0,
    };

    it('records donation for valid txHash and active campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      const donationRecord = {
        id: 'don-1',
        amount: '100',
        assetCode: 'XLM',
        txHash: 'txhash123',
        status: 'PENDING',
        donorId: 'user-1',
        campaignId: 'camp-1',
        tipAmount: null,
        tipAsset: null,
        tipId: null,
        donatedAt: new Date(),
        confirmedAt: null,
        createdAt: new Date(),
        tip: null,
      };
      mockPrisma.donation.create.mockResolvedValue(donationRecord);
      mockPrisma.campaign.update.mockResolvedValue({});

      const result = await service.createDonation('user-1', {
        campaignId: 'camp-1',
        amount: '100',
        assetCode: 'XLM',
        txHash: 'txhash123',
      } as any);

      expect(mockPrisma.donation.create).toHaveBeenCalledTimes(1);
      expect(result.donation.txHash).toBe('txhash123');
      expect(result.tip).toBeNull();
    });

    it('throws NotFoundException for unknown campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.createDonation('user-1', { campaignId: 'unknown', amount: '100' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when campaign is not ACTIVE', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ ...activeCampaign, status: 'DRAFT' });

      await expect(
        service.createDonation('user-1', { campaignId: 'camp-1', amount: '100' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects tip amount of 0 or less', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);

      await expect(
        service.createDonation('user-1', {
          campaignId: 'camp-1',
          amount: '100',
          tipAmount: '0',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException for unknown donation', async () => {
      mockPrisma.donation.findFirst.mockResolvedValue(null);

      await expect(service.findById('unknown', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTipRevenue', () => {
    it('returns aggregated tip revenue', async () => {
      mockPrisma.platformTip.aggregate.mockResolvedValue({
        _count: 5,
        _sum: { amount: 250 },
      });

      const result = await service.getTipRevenue();

      expect(result.totalTips).toBe(5);
      expect(result.totalRevenue).toBe('250');
    });
  });
});
