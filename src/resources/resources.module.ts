import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  Equipment,
  Room,
  ServicePackage,
  User,
} from '../database/entities';
import { ResourcesService } from './resources.service';
import {
  EngineersController,
  EquipmentController,
  PackagesController,
  RoomsController,
} from './resources.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, Equipment, ServicePackage, User, Booking]),
  ],
  controllers: [
    RoomsController,
    EquipmentController,
    PackagesController,
    EngineersController,
  ],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
