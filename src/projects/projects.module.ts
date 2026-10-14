import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  Contract,
  Deliverable,
  DeliverableComment,
  DeliverableVersion,
  Project,
  SessionNote,
  Studio,
  User,
} from '../database/entities';
import { StorageModule } from '../storage/storage.module';
import { MailModule } from '../mail/mail.module';
import { ProjectsService } from './projects.service';
import {
  ContractsController,
  DeliverablesController,
  NotesController,
  ProjectsController,
} from './projects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      SessionNote,
      Deliverable,
      DeliverableVersion,
      DeliverableComment,
      Booking,
      User,
      Studio,
      Contract,
    ]),
    StorageModule,
    MailModule,
  ],
  controllers: [
    ProjectsController,
    NotesController,
    DeliverablesController,
    ContractsController,
  ],
  providers: [ProjectsService],
})
export class ProjectsModule {}
