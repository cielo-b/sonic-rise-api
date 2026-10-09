import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { BookingStatus, ServiceType } from '../../database/enums';

export class UpdateBookingDto {
  @ApiProperty({ enum: BookingStatus, required: false })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ApiProperty({ enum: ServiceType, required: false })
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  totalAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  guestName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  guestEmail?: string;
}
