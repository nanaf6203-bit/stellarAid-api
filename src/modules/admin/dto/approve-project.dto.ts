import { IsString, IsOptional } from 'class-validator';

export class ApproveProjectDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
