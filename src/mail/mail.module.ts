import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from '../database/entities';
import { MailService } from './mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([Studio])],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
