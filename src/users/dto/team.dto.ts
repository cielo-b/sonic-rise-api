import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../database/enums';

export class UpdateTeamMemberDto {
  @ApiProperty({
    required: false,
    enum: [Role.OWNER, Role.MANAGER, Role.ENGINEER, Role.FRONT_DESK],
  })
  @IsOptional()
  @IsIn([Role.OWNER, Role.MANAGER, Role.ENGINEER, Role.FRONT_DESK])
  role?: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isBookable?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
