import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineItemDto {
  @ApiProperty() @IsString() @MaxLength(300) description: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
}

export class CreateDocumentDto {
  @ApiProperty() @IsUUID() clientId: string;
  @ApiProperty() @IsString() @MaxLength(200) title: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lines: LineItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() projectId?: string;
}

export class CreateQuoteDto extends CreateDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}

export class CreateInvoiceDto extends CreateDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() bookingId?: string;
}
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class InvoiceFromBookingDto {
  @ApiProperty() @IsUUID() bookingId: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
