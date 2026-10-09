import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { DeleteAccountDto, UpdateMeDto } from './dto/update-me.dto';
import { UpdateTeamMemberDto } from './dto/team.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudioId } from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

@ApiTags('Me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class MeController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.svc.me(user.id);
  }

  @Patch()
  update(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.svc.updateMe(user, dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Download all personal data held about me' })
  export(@CurrentUser() user: User) {
    return this.svc.exportMine(user);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Erase my personal data and close my account' })
  remove(@CurrentUser() user: User, @Body() dto: DeleteAccountDto) {
    return this.svc.deleteMine(user, dto);
  }
}

@ApiTags('Team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @RequirePermissions(Permission.STAFF_MANAGE)
  list(@StudioId() studioId: string) {
    return this.svc.team(studioId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  update(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.svc.updateMember(studioId, user, id, dto);
  }

  @Post(':id/resend-invite')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.STAFF_MANAGE)
  resend(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.resendInvite(studioId, user, id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Withdraw a pending invitation' })
  withdraw(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.removePendingInvite(studioId, user, id);
  }
}
