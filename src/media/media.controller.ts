import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, UploadedFile,
  UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import * as multer from 'multer';
import { MediaService }    from './media.service';
import { CreateMediaDto }  from './dto/create-media.dto';
import { UpdateMediaDto }  from './dto/update-media.dto';
import { JwtAuthGuard }        from '../common/guards/jwt-auth.guard';
import { RolesGuard }          from '../common/guards/roles.guard';
import { Roles }               from '../common/decorators/roles.decorator';
import { CurrentUser }         from '../common/decorators/current-user.decorator';
import { Role }                from '../database/enums';
import { StorageService }      from '../storage/storage.service';

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff'
];
const MAX_SIZE     = 500 * 1024 * 1024; // 500 MB to accommodate raw assets

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a media file to MinIO (admin only)' })
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file attached');
    // .zip archives are allowed regardless of the MIME type the browser reports.
    if (!ALLOWED_MIME.includes(file.mimetype) && !file.originalname.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }
    const url = await this.storageService.upload(file.buffer, file.originalname, file.mimetype);
    
    // Automatically infer type from mimetype
    let type = 'image';
    if (file.mimetype.startsWith('video/')) type = 'video';
    if (file.mimetype.startsWith('audio/')) type = 'audio';

    return {
      url,
      type,
      size: formatSize(file.size),
      name: file.originalname,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all media assets' })
  findAll(@CurrentUser() user: any) { return this.mediaService.findAll(user); }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single media asset' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) { return this.mediaService.findOne(id, user); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a media asset (admin only)' })
  create(@Body() dto: CreateMediaDto) { return this.mediaService.create(dto); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a media asset (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a media asset (admin only)' })
  remove(@Param('id') id: string) { return this.mediaService.remove(id); }
}
