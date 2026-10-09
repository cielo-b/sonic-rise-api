import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
} from '../database/enums';

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentPurpose })
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  /** Booking, invoice or deliverable id, depending on purpose. */
  @ApiProperty() @IsUUID() targetId: string;

  /** Mobile money number, e.g. +250788123456. */
  @ApiProperty() @Matches(/^\+?[0-9 ()-]{9,20}$/) phone: string;
}

export class RecordPaymentDto {
  @ApiProperty({ enum: PaymentPurpose })
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;
  @ApiProperty() @IsUUID() targetId: string;
  @ApiProperty() @IsNumber() @Min(1) amount: number;

  @ApiProperty({
    enum: [
      PaymentMethod.CASH,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.CARD,
      PaymentMethod.MOBILE_MONEY,
    ],
  })
  @IsIn([
    PaymentMethod.CASH,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.CARD,
    PaymentMethod.MOBILE_MONEY,
  ])
  method: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListPaymentsQuery {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsEnum(PaymentPurpose) purpose?: PaymentPurpose;
  @IsOptional() @IsUUID() bookingId?: string;
  @IsOptional() @IsUUID() invoiceId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
