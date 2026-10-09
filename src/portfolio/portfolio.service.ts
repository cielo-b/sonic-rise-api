import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../database/entities';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
  ) {}

  findAll(): Promise<Portfolio[]> {
    return this.portfolioRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  findFeatured(): Promise<Portfolio[]> {
    return this.portfolioRepo.find({
      where: { isFeatured: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Portfolio> {
    const item = await this.portfolioRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Portfolio item ${id} not found`);
    return item;
  }

  async create(dto: CreatePortfolioDto): Promise<Portfolio> {
    const item = this.portfolioRepo.create(dto);
    return this.portfolioRepo.save(item);
  }

  async update(id: string, dto: UpdatePortfolioDto): Promise<Portfolio> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.portfolioRepo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.portfolioRepo.remove(item);
  }
}
