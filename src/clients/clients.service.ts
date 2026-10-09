import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Booking, User } from '../database/entities';
import { Role } from '../database/enums';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { randomUUID } from 'crypto';

import { MailService } from '../mail/mail.service';

type ClientWithBookings = Omit<User, 'bookings'> & { bookings: Booking[] };

/**
 * User.bookings is a lazy relation (a Promise), which JSON serialisation
 * drops. Resolve it into a plain array so the admin UI receives the bookings.
 */
async function withBookings(client: User): Promise<ClientWithBookings> {
  const bookings = await client.bookings;
  // Drop TypeORM's internal lazy-relation fields (__bookings__, __has_bookings__)
  const fields = Object.fromEntries(
    Object.entries(client).filter(([key]) => !key.startsWith('__')),
  ) as Omit<User, 'bookings'>;
  return { ...fields, bookings };
}

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
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      company: dto.company ?? null,
      category: dto.category ?? null,
      notes: dto.notes ?? null,
      passwordHash,
      role: Role.CLIENT,
    });
    return this.userRepo.save(client);
  }

  async findAll(): Promise<ClientWithBookings[]> {
    const clients = await this.userRepo.find({
      where: { role: Role.CLIENT, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(clients.map(withBookings));
  }

  async findOne(id: string): Promise<ClientWithBookings> {
    const client = await this.userRepo.findOne({
      where: { id, role: Role.CLIENT },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return withBookings(client);
  }

  async update(id: string, dto: UpdateClientDto): Promise<User> {
    const client = await this.userRepo.findOne({
      where: { id, role: Role.CLIENT },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);

    Object.assign(client, dto);
    return this.userRepo.save(client);
  }

  async delete(id: string): Promise<void> {
    const client = await this.userRepo.findOne({
      where: { id, role: Role.CLIENT },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);

    client.isActive = false;
    await this.userRepo.save(client);
  }

  async sendMessage(
    id: string,
    subject: string,
    message: string,
  ): Promise<void> {
    const client = await this.userRepo.findOne({
      where: { id, role: Role.CLIENT },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    if (!client.email)
      throw new ConflictException(`Client ${id} has no email address`);

    await this.mailService.sendDirectMessage(
      client.email,
      client.name,
      subject,
      message,
    );
  }
}
