import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ResolveDisputeDto {
  @IsIn(['UNDER_REVIEW', 'RESOLVED', 'REJECTED'])
  status: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

  @ValidateIf((o) => o.status === 'RESOLVED' || o.status === 'REJECTED')
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  resolution?: string;
}
