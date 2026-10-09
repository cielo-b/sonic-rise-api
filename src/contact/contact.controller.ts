import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsNull, Repository } from 'typeorm';
import { Inquiry, Studio, Subscriber } from '../database/entities';
import { MailService } from '../mail/mail.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentStudio, StudioId } from '../common/decorators/studio.decorator';

class ContactDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(255) name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(10000) message: string;
}

class SubscribeDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty()
  @Equals(true, { message: 'Please agree to receive emails' })
  consent: boolean;
}

class HandledDto {
  @IsBoolean() isHandled: boolean;
}

const LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Contact')
@Controller()
export class ContactController {
  constructor(
    private readonly mail: MailService,
    @InjectRepository(Inquiry) private readonly inquiries: Repository<Inquiry>,
    @InjectRepository(Subscriber)
    private readonly subscribers: Repository<Subscriber>,
  ) {}

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMIT)
  @ApiOperation({ summary: 'Website contact form' })
  async send(@CurrentStudio() studio: Studio, @Body() dto: ContactDto) {
    await this.inquiries.save(
      this.inquiries.create({ ...dto, studioId: studio.id }),
    );
    await this.mail.sendInquiry(studio, dto).catch(() => undefined); // saved either way
    return { ok: true };
  }

  @Post('newsletter')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMIT)
  async subscribe(@StudioId() studioId: string, @Body() dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.subscribers.findOne({
      where: { studioId, email },
    });
    if (existing) {
      await this.subscribers.update(existing.id, {
        unsubscribedAt: null,
        consentAt: new Date(),
      });
    } else {
      await this.subscribers.save(
        this.subscribers.create({ studioId, email, consentAt: new Date() }),
      );
    }
    return { ok: true };
  }

  @Get('inquiries')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CLIENTS_READ)
  @ApiBearerAuth()
  listInquiries(@StudioId() studioId: string) {
    return this.inquiries.find({
      where: { studioId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  @Patch('inquiries/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CLIENTS_WRITE)
  @ApiBearerAuth()
  async markHandled(
    @StudioId() studioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HandledDto,
  ) {
    await this.inquiries.update({ id, studioId }, { isHandled: dto.isHandled });
    return this.inquiries.findOneOrFail({ where: { id, studioId } });
  }

  @Get('subscribers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiBearerAuth()
  listSubscribers(@StudioId() studioId: string) {
    return this.subscribers.find({
      where: { studioId, unsubscribedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }
}
