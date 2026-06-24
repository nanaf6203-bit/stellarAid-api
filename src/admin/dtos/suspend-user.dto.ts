import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
