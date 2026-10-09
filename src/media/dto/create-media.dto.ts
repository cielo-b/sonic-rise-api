import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMediaDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiProperty({ enum: ['image', 'video', 'audio', 'folder'] })
  @IsIn(['image', 'video', 'audio', 'folder'])
  type: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  size?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({
    require_tld: false,
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  url?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFolder?: boolean;
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
