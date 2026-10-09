import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, ListPaymentsQuery, RecordPaymentDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudioId } from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post('mobile-money')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start a mobile money payment (customer approves on their phone)',
  })
  initiate(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.svc.initiate(studioId, user, dto);
  }

  /** Set this URL as the deposit callback in the pawaPay dashboard. */
  @Post('pawapay/callback')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'pawaPay deposit callback' })
  callback(@Body() body: { depositId?: string }) {
    return this.svc.handleCallback(body);
  }

  @Post('manual')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.FINANCE_WRITE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record a cash, bank or card payment taken at the studio',
  })
  record(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.svc.record(studioId, user, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  list(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Query() q: ListPaymentsQuery,
  ) {
    return this.svc.list(studioId, user, q);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  status(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.status(studioId, id, user);
  }
}
