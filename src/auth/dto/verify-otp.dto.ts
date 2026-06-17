import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'admin@sonicrise.rw' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '847291' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
