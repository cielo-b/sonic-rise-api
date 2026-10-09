import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePostDto, PostsService, UpdatePostDto } from './posts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { StudioId } from '../common/decorators/studio.decorator';

const Write = () => RequirePermissions(Permission.CONTENT_WRITE);

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly svc: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Published posts (public)' })
  findAll(@StudioId() s: string) {
    return this.svc.findAll(s, true);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Write()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'All posts including drafts' })
  findAllForAdmin(@StudioId() s: string) {
    return this.svc.findAll(s, false);
  }

  @Get(':slug')
  findOne(@StudioId() s: string, @Param('slug') slug: string) {
    return this.svc.findBySlug(s, slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Write()
  @ApiBearerAuth()
  create(@StudioId() s: string, @Body() dto: CreatePostDto) {
    return this.svc.create(s, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Write()
  @ApiBearerAuth()
  update(
    @StudioId() s: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.svc.update(s, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Write()
  @ApiBearerAuth()
  remove(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(s, id);
  }
}
