import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, User } from '../database/entities';
import { BookingsService }    from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MailModule }         from '../mail/mail.module';

@Module({
  imports:     [TypeOrmModule.forFeature([Booking, User]), MailModule],
  controllers: [BookingsController],
  providers:   [BookingsService],
  exports:     [BookingsService],
})
export class BookingsModule {}
