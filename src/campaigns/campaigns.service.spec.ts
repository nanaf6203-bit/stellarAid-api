import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { StellarTransactionsService } from '../stellar/stellar-transactions.service';

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  donation: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  update: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockStellarTransactions = {
  getContractBalances: jest.fn(),
};

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StellarTransactionsService, useValue: mockStellarTransactions },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('persists correct fields and returns created campaign', async () => {
      const userId = 'user-1';
      const dto = {
        title: 'Clean Water Initiative',
        description: 'Provide clean water',
        goalAmount: 5000,
        endDate: '2025-12-31',
      };
      const expected = { id: 'camp-1', ...dto, creatorId: userId, milestones: [] };
      mockPrisma.campaign.create.mockResolvedValue(expected);

      const result = await service.createCampaign(userId, dto as any);

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: dto.title,
            creatorId: userId,
            status: 'PENDING_APPROVAL',
          }),
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe('updateCampaign', () => {
    it('returns 404 when campaign does not exist', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCampaign('user-1', 'nonexistent-id', { title: 'New Title' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('only allows creator to update campaign', async () => {
      const campaign = { id: 'camp-1', creatorId: 'owner-user', title: 'Original' };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);
      mockPrisma.campaign.update.mockResolvedValue({ ...campaign, title: 'Updated' });

      const result = await service.updateCampaign('owner-user', 'camp-1', { title: 'Updated' } as any);
      expect(result.title).toBe('Updated');
    });
  });

  describe('browseCampaigns', () => {
    it('filters campaigns by status when provided', async () => {
      const campaigns = [{ id: 'camp-1', status: 'ACTIVE' }];
      mockPrisma.$transaction.mockResolvedValue([1, campaigns]);

      const result = await service.browseCampaigns({
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      } as any);

      expect(result.data).toEqual(campaigns);
      expect(result.total).toBe(1);
    });

    it('throws BadRequestException when search term is less than 3 chars', async () => {
      await expect(
        service.browseCampaigns({ page: 1, limit: 10, search: 'ab' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCampaignStats', () => {
    it('returns 404 for unknown campaign ID', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.getCampaignStats('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
