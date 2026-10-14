import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PricingType, EquipmentStatus } from '../database/enums';

const URL_OPTS = {
  require_tld: false,
  protocols: ['http', 'https'],
  require_protocol: true,
};

export class CreateRoomDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl(URL_OPTS)
  imageUrl?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

export class CreateEquipmentDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerBooking?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  purchaseDate?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;
  @ApiProperty({ required: false, enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maintenanceNotes?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}

export class AddMaintenanceLogDto {
  @ApiProperty() @IsString() @MaxLength(120) technician: string;
  @ApiProperty() @IsString() @MaxLength(2000) description: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) cost?: number;
  @ApiProperty({ required: false, enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}

export class CreatePackageDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiProperty() @IsString() @MaxLength(60) category: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  includes?: string[];

  @ApiProperty({ enum: PricingType })
  @IsEnum(PricingType)
  pricingType: PricingType;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiProperty() @IsInt() @Min(15) @Max(24 * 60) durationMinutes: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercent?: number | null;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roomIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  bookableOnline?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdatePackageDto extends PartialType(CreatePackageDto) {}
