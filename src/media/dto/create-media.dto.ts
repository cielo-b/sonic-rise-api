import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';

export class CreateMediaDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  type: string; // 'video' | 'audio' | 'image'

  @ApiProperty()
  @IsString()
  badge: string;

  @ApiProperty()
  @IsString()
  badgeColor: string;

  @ApiProperty()
  @IsString()
  size: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsString()
  statusColor: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  src?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  isFolder?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isFavorite?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  isTrash?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientId?: string;
}
