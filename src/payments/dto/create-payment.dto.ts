import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { PaymentMethod } from '../../database/enums';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 50000, description: 'Amount in RWF' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
