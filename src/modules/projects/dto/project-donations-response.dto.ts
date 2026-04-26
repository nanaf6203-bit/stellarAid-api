import { Expose, Transform } from 'class-transformer';
import { AssetType } from '../../../generated/prisma';

export class DonationDto {
  @Expose()
  id: string;

  @Expose()
  amount: number;

  @Expose()
  assetType: AssetType;

  @Expose()
  transactionHash: string;

  @Expose()
  @Transform(({ obj }) => obj.createdAt.toISOString())
  createdAt: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.donor.isAnonymous || obj.anonymize) {
      return null;
    }
    return {
      id: obj.donor.id,
      firstName: obj.donor.firstName,
      lastName: obj.donor.lastName,
    };
  })
  donor: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.transactionHash) {
      return `https://stellar.expert/explorer/public/tx/${obj.transactionHash}`;
    }
    return null;
  })
  verificationLink: string | null;
}

export class ProjectDonationsResponseDto {
  @Expose()
  donations: DonationDto[];

  @Expose()
  statistics: {
    totalCount: number;
    totalAmount: number;
  };

  @Expose()
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}