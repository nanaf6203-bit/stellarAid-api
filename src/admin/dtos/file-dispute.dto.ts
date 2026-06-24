import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';

export class FileDisputeDto {
  @IsUUID()
  campaignId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceUrls?: string[];
}
