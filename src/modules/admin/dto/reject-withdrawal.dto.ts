import { IsNotEmpty, IsString } from 'class-validator';

export class RejectWithdrawalDto {
  @IsNotEmpty()
  @IsString()
  rejectionReason!: string;
}
