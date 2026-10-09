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
import { ResourcesService } from './resources.service';
import {
  CreateEquipmentDto,
  CreatePackageDto,
  CreateRoomDto,
  UpdateEquipmentDto,
  UpdatePackageDto,
  UpdateRoomDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
  StaffOnly,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { StudioId } from '../common/decorators/studio.decorator';

const Manage = () => RequirePermissions(Permission.RESOURCES_MANAGE);

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly svc: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Active rooms (public)' })
  list(@StudioId() studioId: string) {
    return this.svc.listRooms(studioId, true);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @StaffOnly()
  @ApiBearerAuth()
  listAll(@StudioId() studioId: string) {
    return this.svc.listRooms(studioId, false);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  create(@StudioId() studioId: string, @Body() dto: CreateRoomDto) {
    return this.svc.createRoom(studioId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  update(
    @StudioId() studioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.svc.updateRoom(studioId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  remove(@StudioId() studioId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removeRoom(studioId, id);
  }
}

@ApiTags('Equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly svc: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Active equipment (public)' })
  list(@StudioId() studioId: string) {
    return this.svc.listEquipment(studioId, true);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @StaffOnly()
  @ApiBearerAuth()
  listAll(@StudioId() studioId: string) {
    return this.svc.listEquipment(studioId, false);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  create(@StudioId() studioId: string, @Body() dto: CreateEquipmentDto) {
    return this.svc.createEquipment(studioId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  update(
    @StudioId() studioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.svc.updateEquipment(studioId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  remove(@StudioId() studioId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removeEquipment(studioId, id);
  }
}

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly svc: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Packages clients can book online (public)' })
  list(@StudioId() studioId: string) {
    return this.svc.listPackages(studioId, true);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @StaffOnly()
  @ApiBearerAuth()
  listAll(@StudioId() studioId: string) {
    return this.svc.listPackages(studioId, false);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  create(@StudioId() studioId: string, @Body() dto: CreatePackageDto) {
    return this.svc.createPackage(studioId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  update(
    @StudioId() studioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.svc.updatePackage(studioId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Manage()
  @ApiBearerAuth()
  remove(@StudioId() studioId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removePackage(studioId, id);
  }
}

@ApiTags('Engineers')
@Controller('engineers')
export class EngineersController {
  constructor(private readonly svc: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Team members who can be booked (public)' })
  list(@StudioId() studioId: string) {
    return this.svc.listEngineers(studioId);
  }
}
