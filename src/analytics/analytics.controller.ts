import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../database/enums';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN, Role.CLIENT)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly bookings and revenue for a given year' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  monthly(@Query('year') year?: number, @CurrentUser() user?: any) {
    return this.svc.monthly(user, year ? Number(year) : undefined);
  }

  @Get('services')
  @ApiOperation({ summary: 'Booking volume by service type (%)' })
  services(@CurrentUser() user?: any) {
    return this.svc.services(user);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Top-level KPI summary' })
  summary(@CurrentUser() user?: any) {
    return this.svc.summary(user);
  }
}
