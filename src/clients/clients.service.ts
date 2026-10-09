import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Booking, Invoice, Project, Studio, User } from '../database/entities';
import { BookingStatus, Role } from '../database/enums';
import { MailService } from '../mail/mail.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { bookingReference } from '../bookings/bookings.service';

const clientView = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  company: u.company,
  category: u.category,
  notes: u.notes,
  avatarUrl: u.avatarUrl,
  isActive: u.isActive,
  /** Has set a password and can use the client portal. */
  hasPortalAccess: !!u.consentAt,
  marketingOptIn: u.marketingOptIn,
  createdAt: u.createdAt,
});

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
    private readonly mail: MailService,
  ) {}

  private async get(studioId: string, id: string) {
    const c = await this.users.findOne({
      where: { id, studioId, role: Role.CLIENT },
    });
    if (!c || c.anonymizedAt) throw new NotFoundException('Client not found');
    return c;
  }

  async list(studioId: string, search?: string) {
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.studioId = :studioId', { studioId })
      .andWhere('u.role = :role', { role: Role.CLIENT })
      .andWhere('u.anonymizedAt IS NULL')
      .orderBy('u.createdAt', 'DESC');
    if (search?.trim()) {
      qb.andWhere(
        '(u.name ILIKE :q OR u.email ILIKE :q OR u.company ILIKE :q OR u.phone ILIKE :q)',
        {
          q: `%${search.trim()}%`,
        },
      );
    }
    const clients = await qb.getMany();
    if (!clients.length) return [];

    const stats = await this.bookings
      .createQueryBuilder('b')
      .select('b.clientId', 'clientId')
      .addSelect('COUNT(*)', 'bookings')
      .addSelect(`COALESCE(SUM(b.amountPaid), 0)`, 'paid')
      .addSelect('MAX(b.startsAt)', 'lastSession')
      .where('b.studioId = :studioId', { studioId })
      .andWhere('b.clientId IN (:...ids)', { ids: clients.map((c) => c.id) })
      .andWhere('b.status <> :cancelled', {
        cancelled: BookingStatus.CANCELLED,
      })
      .groupBy('b.clientId')
      .getRawMany<{
        clientId: string;
        bookings: string;
        paid: string;
        lastSession: Date;
      }>();
    const byId = new Map(stats.map((s) => [s.clientId, s]));
    return clients.map((c) => ({
      ...clientView(c),
      bookingCount: Number(byId.get(c.id)?.bookings ?? 0),
      totalPaid: Number(byId.get(c.id)?.paid ?? 0),
      lastSessionAt: byId.get(c.id)?.lastSession ?? null,
    }));
  }

  async detail(studioId: string, id: string) {
    const c = await this.get(studioId, id);
    const [bookings, projects, invoices] = await Promise.all([
      this.bookings.find({
        where: { studioId, clientId: id },
        relations: { package: true, room: true },
        order: { startsAt: 'DESC' },
        take: 100,
      }),
      this.projects.find({
        where: { studioId, clientId: id },
        order: { updatedAt: 'DESC' },
      }),
      this.invoices.find({
        where: { studioId, clientId: id },
        order: { createdAt: 'DESC' },
      }),
    ]);
    return {
      ...clientView(c),
      bookings: bookings.map((b) => ({
        id: b.id,
        reference: bookingReference(b.id),
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
        totalAmount: b.totalAmount,
        amountPaid: b.amountPaid,
        currency: b.currency,
        package: { id: b.package.id, name: b.package.name },
        room: { id: b.room.id, name: b.room.name },
      })),
      projects,
      invoices: invoices.map((i) => ({
        ...i,
        displayNumber: `INV-${String(i.number).padStart(4, '0')}`,
      })),
    };
  }

  async create(studioId: string, dto: CreateClientDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.users
      .createQueryBuilder('u')
      .where('u.studioId = :studioId AND LOWER(u.email) = :email', {
        studioId,
        email,
      })
      .getExists();
    if (exists)
      throw new ConflictException(
        'A client or team member already uses this email',
      );
    const c = await this.users.save(
      this.users.create({
        ...dto,
        email,
        studioId,
        role: Role.CLIENT,
        // No password until they accept a portal invite.
        passwordHash: await bcrypt.hash(randomUUID(), 4),
      }),
    );
    return clientView(c);
  }

  async update(studioId: string, id: string, dto: UpdateClientDto) {
    const c = await this.get(studioId, id);
    if (dto.email && dto.email.toLowerCase() !== c.email) {
      const taken = await this.users
        .createQueryBuilder('u')
        .where(
          'u.studioId = :studioId AND LOWER(u.email) = :email AND u.id <> :id',
          {
            studioId,
            email: dto.email.toLowerCase(),
            id,
          },
        )
        .getExists();
      if (taken) throw new ConflictException('Email already in use');
    }
    Object.assign(c, dto);
    if (dto.email) c.email = dto.email.trim().toLowerCase();
    return clientView(await this.users.save(c));
  }

  /** Deactivates; history stays for the studio's records. */
  async deactivate(studioId: string, id: string) {
    const c = await this.get(studioId, id);
    c.isActive = false;
    await this.users.save(c);
  }

  async reactivate(studioId: string, id: string) {
    const c = await this.users.findOne({
      where: { id, studioId, role: Role.CLIENT },
    });
    if (!c) throw new NotFoundException('Client not found');
    c.isActive = true;
    return clientView(await this.users.save(c));
  }

  /** Emails the client a link to set a password and use the portal. */
  async invite(studioId: string, id: string) {
    const c = await this.get(studioId, id);
    if (c.consentAt)
      throw new BadRequestException('This client already has portal access');
    const inviteToken = randomUUID();
    await this.users.update(id, {
      inviteToken,
      inviteExpiry: new Date(Date.now() + 7 * 86_400_000),
      isActive: false,
    });
    return {
      inviteUrl: await this.mail.sendInvite(studioId, c.email, inviteToken),
    };
  }

  async message(
    studioId: string,
    id: string,
    subject: string,
    message: string,
  ) {
    const c = await this.get(studioId, id);
    const studio = await this.studios.findOneOrFail({
      where: { id: studioId },
    });
    await this.mail.sendDirectMessage(
      studio,
      c.email,
      c.name,
      subject,
      message,
    );
    return { sent: true };
  }
}
