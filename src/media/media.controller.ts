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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudioId } from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

/** Upload files with POST /uploads, then register them here. */
@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CONTENT_WRITE)
@Controller('media')
export class MediaController {
  constructor(private readonly svc: MediaService) {}

  @Get()
  findAll(@StudioId() s: string) {
    return this.svc.findAll(s);
  }

  @Get(':id')
  findOne(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(s, id);
  }

  @Post()
  create(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Body() dto: CreateMediaDto,
  ) {
    return this.svc.create(s, u.id, dto);
  }

  @Patch(':id')
  update(
    @StudioId() s: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.svc.update(s, id, dto);
  }

  @Delete(':id')
  remove(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(s, id);
  }
}
