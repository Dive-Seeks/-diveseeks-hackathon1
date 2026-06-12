import { IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
