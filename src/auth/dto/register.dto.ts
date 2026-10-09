import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Uwimana' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+250788000000', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  /** Must be true: consent to the studio's privacy policy. */
  @ApiProperty()
  @Equals(true, { message: 'Please accept the privacy policy' })
  acceptPrivacy: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  marketingOptIn?: boolean;

  @ApiProperty({ enum: ['en', 'fr', 'rw'], required: false })
  @IsIn(['en', 'fr', 'rw'])
  @IsOptional()
  locale?: string;
}
