import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const HEX = /^#[0-9a-fA-F]{6}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_OPTS = {
  require_tld: false,
  protocols: ['http', 'https'],
  require_protocol: true,
};

class StatDto {
  @IsString() @MaxLength(60) label: string;
  @IsString() @MaxLength(30) value: string;
}

class TestimonialDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(120) role?: string;
  @IsString() @MaxLength(1000) quote: string;
}

class FaqDto {
  @IsString() @MaxLength(200) question: string;
  @IsString() @MaxLength(2000) answer: string;
}

export class StudioContentDto {
  @IsOptional() @IsString() @MaxLength(120) heroTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) heroSubtitle?: string;
  @IsOptional() @IsUrl(URL_OPTS) heroImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(120) aboutTitle?: string;
  @IsOptional() @IsString() @MaxLength(10000) aboutBody?: string;
  @IsOptional() @IsUrl(URL_OPTS) aboutImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => StatDto)
  stats?: StatDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TestimonialDto)
  testimonials?: TestimonialDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FaqDto)
  faq?: FaqDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  rules?: string[];

  @IsOptional() @IsString() @MaxLength(50000) privacyPolicy?: string;
  @IsOptional() @IsString() @MaxLength(50000) termsOfService?: string;
}

class OpeningWindowDto {
  @Matches(TIME) open: string;
  @Matches(TIME) close: string;
}

class OpeningHoursDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '0'?: OpeningWindowDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '1'?: OpeningWindowDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '2'?: OpeningWindowDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '3'?: OpeningWindowDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '4'?: OpeningWindowDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '5'?: OpeningWindowDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningWindowDto)
  '6'?: OpeningWindowDto;
}

class SocialsDto {
  @IsOptional() @IsUrl(URL_OPTS) instagram?: string;
  @IsOptional() @IsUrl(URL_OPTS) youtube?: string;
  @IsOptional() @IsUrl(URL_OPTS) tiktok?: string;
  @IsOptional() @IsUrl(URL_OPTS) x?: string;
  @IsOptional() @IsUrl(URL_OPTS) facebook?: string;
}

export class UpdateStudioDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl(URL_OPTS)
  logoUrl?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(HEX)
  primaryColor?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(HEX)
  accentColor?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  /** RWF per 1 USD; null hides USD prices. */
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usdRate?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['en', 'fr', 'rw'])
  defaultLocale?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercent?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  cancellationHours?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferMinutes?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  cancellationPolicy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OpeningHoursDto)
  openingHours?: OpeningHoursDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StudioContentDto)
  content?: StudioContentDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialsDto)
  socials?: SocialsDto;
}

export class PaymentSettingsDto {
  /** pawaPay API token from dashboard.pawapay.io. Empty string removes it. */
  @ApiProperty() @IsString() @MaxLength(4000) apiToken: string;
  @ApiProperty() @IsBoolean() sandbox: boolean;
}

export class CreateStudioDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;

  @ApiProperty({
    description: 'Lowercase letters, digits and dashes; used as the subdomain',
  })
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/)
  slug: string;

  @ApiProperty() @IsEmail() ownerEmail: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;
}
