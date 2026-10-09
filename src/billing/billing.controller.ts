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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { BillingService } from './billing.service';
import {
  CreateInvoiceDto,
  CreateQuoteDto,
  InvoiceFromBookingDto,
  UpdateInvoiceDto,
  UpdateQuoteDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudioId } from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

class RespondDto {
  @IsBoolean() accept: boolean;
}
class ConvertDto {
  @IsOptional() @IsDateString() dueDate?: string;
}

const Write = () => RequirePermissions(Permission.FINANCE_WRITE);

@ApiTags('Quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class QuotesController {
  constructor(private readonly svc: BillingService) {}

  @Get()
  list(@StudioId() s: string, @CurrentUser() u: User) {
    return this.svc.listQuotes(s, u);
  }

  @Get(':id')
  get(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.getQuote(s, id, u);
  }

  @Post()
  @Write()
  create(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.svc.createQuote(s, u, dto);
  }

  @Patch(':id')
  @Write()
  update(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.svc.updateQuote(s, id, u, dto);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @Write()
  send(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.sendQuote(s, id, u);
  }

  /** Client accepts or declines. */
  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  respond(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondDto,
  ) {
    return this.svc.respondToQuote(s, id, u, dto.accept);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @Write()
  convert(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertDto,
  ) {
    return this.svc.convertQuote(s, id, u, dto.dueDate);
  }

  @Delete(':id')
  @Write()
  remove(@StudioId() s: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteQuote(s, id);
  }
}

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly svc: BillingService) {}

  @Get()
  list(@StudioId() s: string, @CurrentUser() u: User) {
    return this.svc.listInvoices(s, u);
  }

  @Get(':id')
  get(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.getInvoice(s, id, u);
  }

  @Post()
  @Write()
  create(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.svc.createInvoice(s, u, dto);
  }

  @Post('from-booking')
  @Write()
  fromBooking(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Body() dto: InvoiceFromBookingDto,
  ) {
    return this.svc.invoiceFromBooking(s, u, dto);
  }

  @Patch(':id')
  @Write()
  update(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.svc.updateInvoice(s, id, u, dto);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  @Write()
  issue(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.issueInvoice(s, id, u);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @Write()
  void(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.voidInvoice(s, id, u);
  }
}
