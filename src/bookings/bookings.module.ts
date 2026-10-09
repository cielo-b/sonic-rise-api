import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  Equipment,
  Room,
  ServicePackage,
  Studio,
  User,
} from '../database/entities';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Studio,
      User,
      Room,
      Equipment,
      ServicePackage,
    ]),
    MailModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
