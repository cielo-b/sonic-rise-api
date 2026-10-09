import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio, User } from '../database/entities';
import { MailModule } from '../mail/mail.module';
import { StudiosService } from './studios.service';
import {
  PlatformStudiosController,
  StudioController,
} from './studios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, User]), MailModule],
  controllers: [StudioController, PlatformStudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
