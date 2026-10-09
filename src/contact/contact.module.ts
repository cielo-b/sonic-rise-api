import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry, Subscriber } from '../database/entities';
import { ContactController } from './contact.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, Subscriber]), MailModule],
  controllers: [ContactController],
})
export class ContactModule {}
