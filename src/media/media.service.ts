import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../database/entities';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
  ) {}

  findAll(user?: { id: string; role: string }): Promise<Media[]> {
    const where = user?.role === 'CLIENT' ? { clientId: user.id } : {};
    return this.mediaRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(
    id: string,
    user?: { id: string; role: string },
  ): Promise<Media> {
    const where: any = { id };
    if (user?.role === 'CLIENT') where.clientId = user.id;
    const item = await this.mediaRepo.findOne({ where });
    if (!item) throw new NotFoundException(`Media asset ${id} not found`);
    return item;
  }

  async create(dto: CreateMediaDto): Promise<Media> {
    const item = this.mediaRepo.create(dto);
    return this.mediaRepo.save(item);
  }

  async update(id: string, dto: UpdateMediaDto): Promise<Media> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.mediaRepo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.mediaRepo.remove(item);
  }
}
