import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
