import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { ServiceType } from '../../database/enums';

export class CreateBookingDto {
  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiProperty({ example: '2026-07-15T10:00:00Z' })
  @IsDateString()
  dateTime: string;

  @ApiProperty({ example: '2026-07-15T14:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiProperty({ example: 150000, description: 'Total amount in RWF' })
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  guestName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  guestEmail?: string;
}
