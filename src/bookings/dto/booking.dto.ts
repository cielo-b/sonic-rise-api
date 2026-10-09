import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { BookingStatus } from '../../database/enums';

export class CreateBookingDto {
  @ApiProperty() @IsUUID() packageId: string;

  /** Optional: the first free room allowed by the package is picked. */
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() roomId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() engineerId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  equipmentIds?: string[];

  @ApiProperty({ example: '2026-11-05T14:00:00+02:00' })
  @IsDateString()
  startsAt: string;

  /** Required for hourly packages; fixed packages use their duration. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  // ── Staff only ──────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() clientId?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestName?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guestPhone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() projectId?: string;

  /** Staff can set an agreed price instead of the package price. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalOverride?: number;
  @ApiProperty({ required: false, enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNotes?: string;
}

export class UpdateBookingDto {
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() roomId?: string;
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  engineerId?: string | null;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  equipmentIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
  @ApiProperty({ required: false, enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNotes?: string;
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}

export class CancelBookingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListBookingsQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() roomId?: string;
  @IsOptional() @IsUUID() engineerId?: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
}

export class AvailabilityQuery {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @IsOptional() @IsUUID() packageId?: string;
}
