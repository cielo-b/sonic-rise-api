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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { BookingsService } from './bookings.service';
import {
  AvailabilityQuery,
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQuery,
  UpdateBookingDto,
} from './dto/booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  StaffOnly,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudioId } from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Get('calendar.ics')
  @ApiOperation({
    summary: 'iCal / ICS calendar feed for Google / Apple Calendar',
  })
  async calendarIcs(
    @StudioId() studioId: string,
    @Res() res: Response,
    @Query('engineerId') engineerId?: string,
  ) {
    const ics = await this.svc.generateIcsFeed(studioId, engineerId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="studio-calendar.ics"',
    );
    res.send(ics);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Busy times for a day (public, no client details)' })
  availability(@StudioId() studioId: string, @Query() q: AvailabilityQuery) {
    return this.svc.availability(studioId, q);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Book a session (clients) or create one for a client (staff)',
  })
  create(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateBookingDto,
  ) {
    return this.svc.create(studioId, user, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Own bookings (clients) or all bookings (team)' })
  list(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Query() q: ListBookingsQuery,
  ) {
    return this.svc.list(studioId, user, q);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(studioId, id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Client cancels their own booking' })
  cancel(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.svc.cancelOwn(studioId, id, user, dto.reason);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @StaffOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule, reassign or change status (team)' })
  update(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.svc.update(studioId, id, user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @StaffOnly()
  @ApiBearerAuth()
  remove(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.remove(studioId, id, user);
  }
}
