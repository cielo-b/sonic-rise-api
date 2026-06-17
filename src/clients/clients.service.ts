import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities';
import { Role } from '../database/enums';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { randomUUID } from 'crypto';

import { MailService } from '../mail/mail.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateClientDto): Promise<User> {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordToHash = dto.password || randomUUID();
    const passwordHash = await bcrypt.hash(passwordToHash, 12);
    const client = this.userRepo.create({
      name:         dto.name,
      email:        dto.email,
      phone:        dto.phone ?? null,
      company:      dto.company ?? null,
      category:     dto.category ?? null,
      notes:        dto.notes ?? null,
      passwordHash,
      role:         Role.CLIENT,
    });
    return this.userRepo.save(client);
  }

  findAll(): Promise<User[]> {
    return this.userRepo.find({
      where: { role: Role.CLIENT, isActive: true },
      relations: { bookings: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User & { bookings: unknown }> {
    const client = await this.userRepo.findOne({
      where:     { id, role: Role.CLIENT },
      relations: { bookings: true },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client as User & { bookings: unknown };
  }

  async update(id: string, dto: UpdateClientDto): Promise<User> {
    const client = await this.userRepo.findOne({ where: { id, role: Role.CLIENT } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    
    Object.assign(client, dto);
    return this.userRepo.save(client);
  }

  async delete(id: string): Promise<void> {
    const client = await this.userRepo.findOne({ where: { id, role: Role.CLIENT } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    
    client.isActive = false;
    await this.userRepo.save(client);
  }

  async sendMessage(id: string, subject: string, message: string): Promise<void> {
    const client = await this.userRepo.findOne({ where: { id, role: Role.CLIENT } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    if (!client.email) throw new ConflictException(`Client ${id} has no email address`);

    await this.mailService.sendDirectMessage(client.email, client.name, subject, message);
  }
}
