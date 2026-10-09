import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../database/entities';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio) private readonly repo: Repository<Portfolio>,
  ) {}

  findAll(studioId: string) {
    return this.repo.find({
      where: { studioId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  findFeatured(studioId: string) {
    return this.repo.find({
      where: { studioId, isFeatured: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(studioId: string, id: string) {
    const item = await this.repo.findOne({ where: { id, studioId } });
    if (!item) throw new NotFoundException('Portfolio item not found');
    return item;
  }

  create(studioId: string, dto: CreatePortfolioDto) {
    return this.repo.save(this.repo.create({ ...dto, studioId }));
  }

  async update(studioId: string, id: string, dto: UpdatePortfolioDto) {
    const item = await this.findOne(studioId, id);
    return this.repo.save(Object.assign(item, dto));
  }

  async remove(studioId: string, id: string) {
    await this.repo.remove(await this.findOne(studioId, id));
  }
}
