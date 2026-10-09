import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Invoice, Quote, Studio, User } from '../database/entities';
import { MailModule } from '../mail/mail.module';
import { BillingService } from './billing.service';
import { InvoicesController, QuotesController } from './billing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, Invoice, Studio, User, Booking]),
    MailModule,
  ],
  controllers: [QuotesController, InvoicesController],
  providers: [BillingService],
})
export class BillingModule {}
