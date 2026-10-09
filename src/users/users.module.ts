import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginLog, User } from '../database/entities';
import { MailModule } from '../mail/mail.module';
import { UsersService } from './users.service';
import { MeController, TeamController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, LoginLog]), MailModule],
  controllers: [MeController, TeamController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
