import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStage } from '../database/enums';

export class CreateProjectDto {
  @ApiProperty() @IsUUID() clientId: string;
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
  @ApiProperty({ required: false, enum: ProjectStage })
  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() leadId?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class CreateNoteDto {
  @ApiProperty() @IsString() @MaxLength(10000) body: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  visibleToClient?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() bookingId?: string;
}

export class CreateDeliverableDto {
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
  /** Price to download once approved (0 = free). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
export class UpdateDeliverableDto extends PartialType(CreateDeliverableDto) {}

export class UploadVersionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CommentDto {
  @ApiProperty() @IsString() @MaxLength(4000) body: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  atSeconds?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsUUID() versionId?: string;
}

export class RequestChangesDto {
  @ApiProperty() @IsString() @MaxLength(4000) body: string;
}

export class CreateContractDto {
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MaxLength(200) trackTitle: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() type?: string;
  @ApiProperty()
  @IsArray()
  splits: Array<{
    name: string;
    email: string;
    role: string;
    masterShare: number;
    publishingShare: number;
    proAffiliation?: string;
    ipiNumber?: string;
  }>;
  @ApiProperty({ required: false }) @IsOptional() @IsString() terms?: string;
}

export class SignContractDto {
  @ApiProperty() @IsString() signatureData: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() contributorEmail?: string;
}

export class UploadStemDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
}
