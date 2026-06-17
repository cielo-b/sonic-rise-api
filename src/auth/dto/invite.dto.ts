import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../database/enums';

export class InviteDto {
  @ApiProperty({ example: 'newstaff@sonicrise.rw' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
