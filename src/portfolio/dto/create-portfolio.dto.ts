import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';

export class CreatePortfolioDto {
  @ApiProperty({ example: 'Echoes of Rwanda' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Music Video' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'https://cdn.sonicrise.rw/portfolio/echoes.mp4' })
  @IsUrl({ require_tld: false })
  mediaUrl: string;

  @ApiProperty({ required: false })
  @IsUrl({ require_tld: false })
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
