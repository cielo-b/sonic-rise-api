import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { StudiosService } from './studios.service';
import {
  CreateStudioDto,
  PaymentSettingsDto,
  UpdateStudioDto,
} from './dto/update-studio.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  PlatformOnly,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentStudio, StudioId } from '../common/decorators/studio.decorator';
import type { Studio } from '../database/entities';

class SetActiveDto {
  @IsBoolean() isActive: boolean;
}

@ApiTags('Studio')
@Controller('studio')
export class StudioController {
  constructor(private readonly svc: StudiosService) {}

  @Get()
  @ApiOperation({ summary: 'Public profile of the current studio (website)' })
  profile(@CurrentStudio() studio: Studio) {
    return this.svc.publicProfile(studio);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.STUDIO_SETTINGS)
  @ApiBearerAuth()
  settings(@StudioId() studioId: string) {
    return this.svc.settings(studioId);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.STUDIO_SETTINGS)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Branding, booking rules, opening hours and site content',
  })
  update(@StudioId() studioId: string, @Body() dto: UpdateStudioDto) {
    return this.svc.update(studioId, dto);
  }

  @Put('payments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.STUDIO_BILLING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set the pawaPay API token (owner only)' })
  setPayments(@StudioId() studioId: string, @Body() dto: PaymentSettingsDto) {
    return this.svc.setPayments(studioId, dto);
  }
}

@ApiTags('Platform')
@Controller('platform/studios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@PlatformOnly()
@ApiBearerAuth()
export class PlatformStudiosController {
  constructor(private readonly svc: StudiosService) {}

  @Get()
  list() {
    return this.svc.listAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a studio and invite its owner' })
  create(@Body() dto: CreateStudioDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetActiveDto) {
    return this.svc.setActive(id, dto.isActive);
  }
}
