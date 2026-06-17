import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, UploadedFile,
  UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import * as multer from 'multer';
import { PortfolioService }    from './portfolio.service';
import { CreatePortfolioDto }  from './dto/create-portfolio.dto';
import { UpdatePortfolioDto }  from './dto/update-portfolio.dto';
import { JwtAuthGuard }        from '../common/guards/jwt-auth.guard';
import { RolesGuard }          from '../common/guards/roles.guard';
import { Roles }               from '../common/decorators/roles.decorator';
import { Role }                from '../database/enums';
import { StorageService }      from '../storage/storage.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];
const MAX_SIZE     = 100 * 1024 * 1024; // 100 MB

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly storageService:   StorageService,
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
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }
    const url = await this.storageService.upload(file.buffer, file.originalname, file.mimetype);
    return { url };
  }

  @Get()
  @ApiOperation({ summary: 'Get all portfolio items (public)' })
  findAll() { return this.portfolioService.findAll(); }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured items for the homepage (public)' })
  findFeatured() { return this.portfolioService.findFeatured(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single portfolio item (public)' })
  findOne(@Param('id') id: string) { return this.portfolioService.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a portfolio item (admin only)' })
  create(@Body() dto: CreatePortfolioDto) { return this.portfolioService.create(dto); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a portfolio item (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePortfolioDto) {
    return this.portfolioService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a portfolio item (admin only)' })
  remove(@Param('id') id: string) { return this.portfolioService.remove(id); }
}
