import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../database/entities';
import { AnalyticsService }    from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Booking])],
  controllers: [AnalyticsController],
  providers:   [AnalyticsService],
})
export class AnalyticsModule {}
