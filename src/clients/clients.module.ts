import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities';
import { ClientsService }    from './clients.service';
import { ClientsController } from './clients.controller';

import { MailModule } from '../mail/mail.module';

@Module({
  imports:     [TypeOrmModule.forFeature([User]), MailModule],
  controllers: [ClientsController],
  providers:   [ClientsService],
})
export class ClientsModule {}
