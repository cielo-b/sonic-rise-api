import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from '../../database/enums';

export class InviteDto {
  @ApiProperty({ example: 'newstaff@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    enum: [Role.OWNER, Role.MANAGER, Role.ENGINEER, Role.FRONT_DESK],
  })
  @IsIn([Role.OWNER, Role.MANAGER, Role.ENGINEER, Role.FRONT_DESK])
  role: Role;

  /** Can be assigned to sessions. Defaults to true for engineers. */
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isBookable?: boolean;
}
