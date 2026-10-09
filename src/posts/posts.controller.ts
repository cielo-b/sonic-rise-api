import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PostsService, CreatePostDto, UpdatePostDto } from './posts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../database/enums';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly svc: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List published posts (public)' })
  findAll() {
    return this.svc.findAll(true);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all posts including drafts (admin only)' })
  findAllForAdmin() {
    return this.svc.findAll(false);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published post by slug (public)' })
  findOne(@Param('slug') slug: string) {
    return this.svc.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a post (admin only)' })
  create(@Body() dto: CreatePostDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post (admin only)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
