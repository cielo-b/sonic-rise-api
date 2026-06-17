import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findAll() {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(randomUUID(), 12);
    const user = this.userRepo.create({
      ...dto,
      passwordHash,
    });
    return this.userRepo.save(user);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    const payload: Partial<User> = {};
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.createQueryBuilder('u')
        .where('LOWER(u.email) = LOWER(:email)', { email: dto.email.trim() })
        .getOne();
      if (existing) throw new ConflictException('Email already registered');
      payload.email = dto.email.trim();
    }

    if (dto.password) {
      payload.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const { password, email, ...rest } = dto;
    Object.assign(payload, rest);
    
    if (Object.keys(payload).length > 0) {
      await this.userRepo.update(user.id, payload);
    }
    
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.userRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepo.remove(user);
  }
}
