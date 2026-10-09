import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;
  /** Free text, e.g. Artist, Label, Agency, Corporate. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
  /** Team-only notes. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class MessageClientDto {
  @ApiProperty() @IsString() @MaxLength(200) subject: string;
  @ApiProperty() @IsString() @MaxLength(10000) message: string;
}
