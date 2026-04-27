import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @IsNotEmpty()
  @IsString()
  projectId!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(0.0000001)
  amount!: number;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsNotEmpty()
  @IsString()
  walletAddress!: string;
}
