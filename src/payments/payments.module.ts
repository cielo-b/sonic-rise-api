import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  Deliverable,
  Invoice,
  Payment,
  Project,
  Studio,
  User,
} from '../database/entities';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Booking,
      Invoice,
      Deliverable,
      Project,
      Studio,
      User,
    ]),
    MailModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
