import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDonationDto {
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  txHash?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  tipAmount?: string;

  @IsOptional()
  @IsString()
  tipAsset?: string;
}
