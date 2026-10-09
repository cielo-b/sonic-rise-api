import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { StudioId } from '../common/decorators/studio.decorator';

class RangeQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('overview')
  @RequirePermissions(Permission.REPORTS_READ)
  overview(@StudioId() s: string, @Query() q: RangeQuery) {
    return this.svc.overview(s, q.from, q.to);
  }

  @Get('today')
  @RequirePermissions(Permission.BOOKINGS_READ)
  today(@StudioId() s: string) {
    return this.svc.today(s);
  }
}
