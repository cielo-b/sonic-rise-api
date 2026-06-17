import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from '../database/entities';
import { PortfolioService }    from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { StorageModule }       from '../storage/storage.module';

@Module({
  imports:     [TypeOrmModule.forFeature([Portfolio]), StorageModule],
  controllers: [PortfolioController],
  providers:   [PortfolioService],
  exports:     [PortfolioService],
})
export class PortfolioModule {}
