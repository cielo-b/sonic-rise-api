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
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { StudioId } from '../common/decorators/studio.decorator';

const Write = () => RequirePermissions(Permission.CONTENT_WRITE);

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @Get()
  findAll(@StudioId() s: string) {
    return this.svc.findAll(s);
  }

  @Get('featured')
  findFeatured(@StudioId() s: string) {
    return this.svc.findFeatured(s);
  }

  @Get(':id')
  findOne(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(s, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Write()
  @ApiBearerAuth()
  create(@StudioId() s: string, @Body() dto: CreatePortfolioDto) {
    return this.svc.create(s, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Write()
  @ApiBearerAuth()
  update(
    @StudioId() s: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortfolioDto,
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
