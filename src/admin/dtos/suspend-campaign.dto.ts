import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SuspendCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
