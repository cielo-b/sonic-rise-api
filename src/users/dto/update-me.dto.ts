import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Fields a user may change on their own account. Role and active status are
 * deliberately absent — those go through the team endpoints.
 */
export class UpdateMeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({
    require_tld: false,
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['en', 'fr', 'rw'])
  preferredLocale?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({
    required: false,
    description: 'Required when changing password or email',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;
}

export class DeleteAccountDto {
  @ApiProperty() @IsString() password: string;
}
