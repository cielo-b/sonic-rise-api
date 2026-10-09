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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  MessageClientDto,
  UpdateClientDto,
} from './dto/client.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { StudioId } from '../common/decorators/studio.decorator';

const Read = () => RequirePermissions(Permission.CLIENTS_READ);
const Write = () => RequirePermissions(Permission.CLIENTS_WRITE);

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @Read()
  list(@StudioId() s: string, @Query('q') q?: string) {
    return this.svc.list(s, q);
  }

  @Get(':id')
  @Read()
  detail(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.detail(s, id);
  }

  @Post()
  @Write()
  create(@StudioId() s: string, @Body() dto: CreateClientDto) {
    return this.svc.create(s, dto);
  }

  @Patch(':id')
  @Write()
  update(
    @StudioId() s: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.svc.update(s, id, dto);
  }

  @Delete(':id')
  @Write()
  deactivate(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deactivate(s, id);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Write()
  reactivate(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.reactivate(s, id);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @Write()
  invite(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.invite(s, id);
  }

  @Post(':id/message')
  @HttpCode(HttpStatus.OK)
  @Write()
  message(
    @StudioId() s: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MessageClientDto,
  ) {
    return this.svc.message(s, id, dto.subject, dto.message);
  }
}
