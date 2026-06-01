import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDonationDto {
  @IsString()
  campaignId: string;

  @IsString()
  txHash: string;

  @IsString()
  amount: string;

  @IsString()
  assetCode: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnonymous?: boolean;
}

