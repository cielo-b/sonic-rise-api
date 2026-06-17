import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MailService } from '../mail/mail.service';

class ContactDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail()  email: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() phone?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() subject?: string;
  @ApiProperty() @IsString() @MinLength(10) message: string;
}

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly mail: MailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a contact message to the studio' })
  async send(@Body() dto: ContactDto) {
    await this.mail.sendContactMessage({
      from:    dto.email,
      name:    dto.name,
      phone:   dto.phone  ?? '',
      subject: dto.subject ?? 'General Enquiry',
      message: dto.message,
    });
    return { ok: true };
  }
}
