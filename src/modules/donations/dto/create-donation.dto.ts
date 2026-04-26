import { IsNotEmpty, IsString, IsDecimal, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { AssetType } from '../../../../generated/prisma';

export class CreateDonationDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  @IsDecimal()
  amount: number;

  @IsNotEmpty()
  @IsEnum(AssetType)
  assetType: AssetType;
}