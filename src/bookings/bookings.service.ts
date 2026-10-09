import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  LessThan,
  Repository,
} from 'typeorm';
import {
  Booking,
  Equipment,
  Room,
  ServicePackage,
  Studio,
  User,
} from '../database/entities';
import {
  BookingSource,
  BookingStatus,
  PricingType,
  Role,
  STAFF_ROLES,
} from '../database/enums';
import { hasPermission, Permission } from '../common/permissions';
import { localParts, toMinutes, zonedToUtc } from '../common/time';
import { MailService } from '../mail/mail.service';
import {
  AvailabilityQuery,
  CreateBookingDto,
  ListBookingsQuery,
  UpdateBookingDto,
} from './dto/booking.dto';

/** Statuses that hold a room, engineer and equipment. */
export const ACTIVE_STATUSES = [
  BookingStatus.PENDING_DEPOSIT,
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

/** Unpaid deposit holds are released after this long. */
const DEPOSIT_HOLD_MINUTES = 30;

export function bookingReference(id: string): string {
  return `BK-${id.slice(0, 8).toUpperCase()}`;
}

interface Resolved {
  pkg: ServicePackage;
  room: Room;
  engineer: User | null;
  equipment: Equipment[];
  startsAt: Date;
  endsAt: Date;
}

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(BookingsService.name);
  private sweeper?: NodeJS.Timeout;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Equipment)
    private readonly equipment: Repository<Equipment>,
    @InjectRepository(ServicePackage)
    private readonly packages: Repository<ServicePackage>,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(() => void this.releaseExpiredHolds(), 60_000);
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  /** Cancels bookings whose deposit wasn't paid in time, freeing the slot. */
  async releaseExpiredHolds() {
    try {
      const cutoff = new Date(Date.now() - DEPOSIT_HOLD_MINUTES * 60_000);
      const result = await this.bookings.update(
        { status: BookingStatus.PENDING_DEPOSIT, createdAt: LessThan(cutoff) },
        {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: 'Deposit not paid in time',
        },
      );
      if (result.affected)
        this.log.log(`Released ${result.affected} unpaid booking hold(s)`);
    } catch (err) {
      this.log.error('Failed to release expired holds', err as Error);
    }
  }

  private isStaff(user: User) {
    return user.role === Role.PLATFORM_ADMIN || STAFF_ROLES.includes(user.role);
  }

  private async studio(studioId: string) {
    const studio = await this.studios.findOne({ where: { id: studioId } });
    if (!studio) throw new NotFoundException('Studio not found');
    return studio;
  }

  // ─── Validation & pricing ──────────────────────────────────────────────────
  private async resolve(
    studio: Studio,
    input: {
      packageId: string;
      roomId?: string;
      engineerId?: string | null;
      equipmentIds?: string[];
      startsAt: string | Date;
      endsAt?: string | Date;
    },
    asStaff: boolean,
    manager: EntityManager,
    ignoreBookingId?: string,
  ): Promise<Resolved> {
    const pkg = await manager.findOne(ServicePackage, {
      where: { id: input.packageId, studioId: studio.id },
    });
    if (!pkg || !pkg.isActive)
      throw new BadRequestException('This service is not available');
    if (!asStaff && !pkg.bookableOnline) {
      throw new BadRequestException(
        'This service can only be booked through the studio',
      );
    }

    const startsAt = new Date(input.startsAt);
    let endsAt: Date;
    if (pkg.pricingType === PricingType.HOURLY && input.endsAt) {
      endsAt = new Date(input.endsAt);
    } else {
      endsAt = new Date(startsAt.getTime() + pkg.durationMinutes * 60_000);
    }
    if (Number.isNaN(startsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Invalid session time');
    }
    if (
      pkg.pricingType === PricingType.HOURLY &&
      endsAt.getTime() - startsAt.getTime() < pkg.durationMinutes * 60_000
    ) {
      throw new BadRequestException(
        `Minimum length is ${pkg.durationMinutes} minutes`,
      );
    }
    if (!asStaff && startsAt.getTime() < Date.now() + 15 * 60_000) {
      throw new BadRequestException('Please choose a time in the future');
    }
    if (!asStaff) this.checkOpeningHours(studio, startsAt, endsAt);

    const engineer = input.engineerId
      ? await manager.findOne(User, {
          where: {
            id: input.engineerId,
            studioId: studio.id,
            isBookable: true,
            isActive: true,
          },
        })
      : null;
    if (input.engineerId && !engineer)
      throw new BadRequestException('That team member is not available');

    const equipment = input.equipmentIds?.length
      ? await manager.find(Equipment, {
          where: {
            id: In(input.equipmentIds),
            studioId: studio.id,
            isActive: true,
          },
        })
      : [];
    if (equipment.length !== new Set(input.equipmentIds ?? []).size) {
      throw new BadRequestException('Some equipment is not available');
    }

    const allowedRooms = await manager.find(Room, {
      where: {
        studioId: studio.id,
        isActive: true,
        ...(pkg.roomIds.length ? { id: In(pkg.roomIds) } : {}),
      },
      order: { sortOrder: 'ASC' },
    });
    let room: Room | undefined;
    if (input.roomId) {
      room = allowedRooms.find((r) => r.id === input.roomId);
      if (!room)
        throw new BadRequestException(
          'That room is not available for this service',
        );
      await this.assertFree(
        studio,
        manager,
        { room, engineer, equipment, startsAt, endsAt },
        ignoreBookingId,
      );
    } else {
      for (const candidate of allowedRooms) {
        const free = await this.conflicts(
          studio,
          manager,
          { room: candidate, engineer: null, equipment: [], startsAt, endsAt },
          ignoreBookingId,
        );
        if (!free.length) {
          room = candidate;
          break;
        }
      }
      if (!room) throw new ConflictException('No room is free at that time');
      await this.assertFree(
        studio,
        manager,
        { room, engineer, equipment, startsAt, endsAt },
        ignoreBookingId,
      );
    }
    return { pkg, room, engineer, equipment, startsAt, endsAt };
  }

  private checkOpeningHours(studio: Studio, startsAt: Date, endsAt: Date) {
    const hours = studio.openingHours ?? {};
    if (!Object.keys(hours).length) return; // studio hasn't set hours
    const start = localParts(startsAt, studio.timezone);
    const end = localParts(new Date(endsAt.getTime() - 1), studio.timezone);
    const window = hours[String(start.weekday) as keyof typeof hours];
    if (!window) throw new BadRequestException('The studio is closed that day');
    const open = toMinutes(window.open);
    const close = window.close === '00:00' ? 24 * 60 : toMinutes(window.close);
    const sameDay = start.date === end.date;
    if (start.minutes < open || !sameDay || end.minutes + 1 > close) {
      throw new BadRequestException(
        `Sessions that day must be between ${window.open} and ${window.close}`,
      );
    }
  }

  /** Human-readable clashes with other active bookings. */
  private async conflicts(
    studio: Studio,
    manager: EntityManager,
    r: {
      room: Room;
      engineer: User | null;
      equipment: Equipment[];
      startsAt: Date;
      endsAt: Date;
    },
    ignoreBookingId?: string,
  ): Promise<string[]> {
    const buffer = studio.bufferMinutes * 60_000;
    const holdCutoff = new Date(Date.now() - DEPOSIT_HOLD_MINUTES * 60_000);
    const base = () => {
      const qb = manager
        .createQueryBuilder(Booking, 'b')
        .where('b.studioId = :sid', { sid: studio.id })
        .andWhere('b.status IN (:...active)', { active: ACTIVE_STATUSES })
        // Expired deposit holds no longer block the slot.
        .andWhere(
          "NOT (b.status = 'PENDING_DEPOSIT' AND b.createdAt < :holdCutoff)",
          { holdCutoff },
        )
        .andWhere('b.startsAt < :end AND b.endsAt > :start');
      if (ignoreBookingId)
        qb.andWhere('b.id <> :ignore', { ignore: ignoreBookingId });
      return qb;
    };
    const issues: string[] = [];
    const roomClash = await base()
      .andWhere('b.roomId = :roomId', { roomId: r.room.id })
      .setParameters({
        start: new Date(r.startsAt.getTime() - buffer),
        end: new Date(r.endsAt.getTime() + buffer),
      })
      .getExists();
    if (roomClash) issues.push(`${r.room.name} is already booked at that time`);

    if (r.engineer) {
      const engClash = await base()
        .andWhere('b.engineerId = :eid', { eid: r.engineer.id })
        .setParameters({ start: r.startsAt, end: r.endsAt })
        .getExists();
      if (engClash)
        issues.push(`${r.engineer.name} is already booked at that time`);
    }
    for (const item of r.equipment) {
      const clash = await base()
        .innerJoin('b.equipment', 'e', 'e.id = :eqid', { eqid: item.id })
        .setParameters({ start: r.startsAt, end: r.endsAt })
        .getExists();
      if (clash) issues.push(`${item.name} is already reserved at that time`);
    }
    return issues;
  }

  private async assertFree(...args: Parameters<BookingsService['conflicts']>) {
    const issues = await this.conflicts(...args);
    if (issues.length) throw new ConflictException(issues.join('. '));
  }

  private price(r: Resolved): number {
    const hours = (r.endsAt.getTime() - r.startsAt.getTime()) / 3_600_000;
    const base =
      r.pkg.pricingType === PricingType.HOURLY
        ? r.pkg.price * hours
        : r.pkg.price;
    const gear = r.equipment.reduce((sum, e) => sum + e.pricePerBooking, 0);
    return Math.round(base + gear);
  }

  /** Serialises booking writes per studio so two people can't take the same slot. */
  private withStudioLock<T>(
    studioId: string,
    work: (m: EntityManager) => Promise<T>,
  ) {
    return this.db.transaction(async (m) => {
      await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [studioId]);
      return work(m);
    });
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(studioId: string, actor: User, dto: CreateBookingDto) {
    const studio = await this.studio(studioId);
    const asStaff = this.isStaff(actor);
    if (asStaff && !hasPermission(actor.role, Permission.BOOKINGS_WRITE)) {
      throw new ForbiddenException('You cannot create bookings');
    }

    const saved = await this.withStudioLock(studioId, async (m) => {
      const r = await this.resolve(studio, dto, asStaff, m);
      const total =
        asStaff && dto.totalOverride !== undefined
          ? Math.round(dto.totalOverride)
          : this.price(r);
      const pct = r.pkg.depositPercent ?? studio.depositPercent;
      const deposit = Math.round((total * pct) / 100);

      let clientId: string | null = null;
      if (asStaff) {
        if (dto.clientId) {
          const client = await m.findOne(User, {
            where: { id: dto.clientId, studioId, role: Role.CLIENT },
          });
          if (!client) throw new BadRequestException('Client not found');
          clientId = client.id;
        } else if (!dto.guestName) {
          throw new BadRequestException(
            'Choose a client or enter a walk-in name',
          );
        }
      } else {
        clientId = actor.id;
      }

      const status = asStaff
        ? (dto.status ?? BookingStatus.CONFIRMED)
        : deposit > 0
          ? BookingStatus.PENDING_DEPOSIT
          : BookingStatus.PENDING;

      return m.save(
        m.create(Booking, {
          studioId,
          clientId,
          guestName: asStaff && !clientId ? (dto.guestName ?? null) : null,
          guestEmail: asStaff && !clientId ? (dto.guestEmail ?? null) : null,
          guestPhone: asStaff && !clientId ? (dto.guestPhone ?? null) : null,
          packageId: r.pkg.id,
          roomId: r.room.id,
          engineerId: r.engineer?.id ?? null,
          equipment: r.equipment,
          projectId: asStaff ? (dto.projectId ?? null) : null,
          startsAt: r.startsAt,
          endsAt: r.endsAt,
          status,
          source: asStaff ? BookingSource.STAFF : BookingSource.WEB,
          totalAmount: total,
          depositAmount: deposit,
          currency: studio.currency,
          notes: dto.notes ?? null,
          internalNotes: asStaff ? (dto.internalNotes ?? null) : null,
        }),
      );
    });

    const booking = await this.findOne(studioId, saved.id, actor);
    void this.notifyCreated(studio, booking);
    return booking;
  }

  private portalUrl(studio: Studio, id: string) {
    return `${this.mail.siteUrl(studio)}/portal/bookings/${id}`;
  }

  private async notifyCreated(studio: Studio, b: Booking) {
    const to = b.client?.email ?? b.guestEmail;
    const name = b.client?.name ?? b.guestName ?? '';
    if (!to) return;
    await this.mail.sendBookingReceived(
      studio,
      to,
      name,
      {
        reference: bookingReference(b.id),
        packageName: b.package.name,
        roomName: b.room.name,
        startsAt: b.startsAt,
        total: b.totalAmount,
        deposit:
          b.status === BookingStatus.PENDING_DEPOSIT ? b.depositAmount : 0,
        currency: b.currency,
      },
      this.portalUrl(studio, b.id),
    );
  }

  private async notifyStatus(studio: Studio, b: Booking) {
    const to = b.client?.email ?? b.guestEmail;
    if (!to) return;
    await this.mail.sendBookingStatus(
      studio,
      to,
      b.client?.name ?? b.guestName ?? '',
      b.status,
      {
        reference: bookingReference(b.id),
        packageName: b.package.name,
        startsAt: b.startsAt,
      },
      this.portalUrl(studio, b.id),
    );
  }

  // ─── Read ──────────────────────────────────────────────────────────────────
  private relations = {
    client: true,
    engineer: true,
    room: true,
    package: true,
    equipment: true,
  };

  /** Strips staff-only fields for clients. */
  private view(b: Booking, viewer: User) {
    const out = { ...b, reference: bookingReference(b.id) } as Booking & {
      reference: string;
    };
    const safeUser = (u: User | null) =>
      u
        ? ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            avatarUrl: u.avatarUrl,
          } as User)
        : null;
    out.client = safeUser(b.client);
    out.engineer = b.engineer
      ? ({
          id: b.engineer.id,
          name: b.engineer.name,
          avatarUrl: b.engineer.avatarUrl,
        } as User)
      : null;
    if (!this.isStaff(viewer)) out.internalNotes = null;
    return out;
  }

  async list(studioId: string, viewer: User, q: ListBookingsQuery) {
    const where: FindOptionsWhere<Booking> = { studioId };
    if (!this.isStaff(viewer)) where.clientId = viewer.id;
    else if (q.clientId) where.clientId = q.clientId;
    if (q.roomId) where.roomId = q.roomId;
    if (q.engineerId) where.engineerId = q.engineerId;
    if (q.status) where.status = q.status;
    if (q.from && q.to)
      where.startsAt = Between(new Date(q.from), new Date(q.to));

    const rows = await this.bookings.find({
      where,
      relations: this.relations,
      order: { startsAt: q.from ? 'ASC' : 'DESC' },
      take: 500,
    });
    return rows.map((b) => this.view(b, viewer));
  }

  async findOne(studioId: string, id: string, viewer: User) {
    const b = await this.bookings.findOne({
      where: { id, studioId },
      relations: this.relations,
    });
    if (!b || (!this.isStaff(viewer) && b.clientId !== viewer.id)) {
      throw new NotFoundException('Booking not found');
    }
    return this.view(b, viewer);
  }

  /** Busy times for one local day — no client details, for the booking page. */
  async availability(studioId: string, q: AvailabilityQuery) {
    const studio = await this.studio(studioId);
    const dayStart = zonedToUtc(q.date, '00:00', studio.timezone);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const holdCutoff = new Date(Date.now() - DEPOSIT_HOLD_MINUTES * 60_000);
    const busy = await this.bookings
      .createQueryBuilder('b')
      .leftJoin('b.equipment', 'e')
      .select([
        'b.id',
        'b.roomId',
        'b.engineerId',
        'b.startsAt',
        'b.endsAt',
        'e.id',
      ])
      .where('b.studioId = :sid', { sid: studioId })
      .andWhere('b.status IN (:...active)', { active: ACTIVE_STATUSES })
      .andWhere(
        "NOT (b.status = 'PENDING_DEPOSIT' AND b.createdAt < :holdCutoff)",
        { holdCutoff },
      )
      .andWhere('b.startsAt < :end AND b.endsAt > :start', {
        start: dayStart,
        end: dayEnd,
      })
      .getMany();
    const weekday = localParts(
      new Date(dayStart.getTime() + 12 * 3_600_000),
      studio.timezone,
    ).weekday;
    return {
      date: q.date,
      timezone: studio.timezone,
      bufferMinutes: studio.bufferMinutes,
      openingHours: Object.keys(studio.openingHours ?? {}).length
        ? (studio.openingHours[
            String(weekday) as keyof typeof studio.openingHours
          ] ?? null)
        : undefined,
      busy: busy.map((b) => ({
        roomId: b.roomId,
        engineerId: b.engineerId,
        equipmentIds: b.equipment.map((e) => e.id),
        startsAt: b.startsAt,
        endsAt: b.endsAt,
      })),
    };
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(
    studioId: string,
    id: string,
    actor: User,
    dto: UpdateBookingDto,
  ) {
    if (!hasPermission(actor.role, Permission.BOOKINGS_WRITE)) {
      throw new ForbiddenException('You cannot change bookings');
    }
    const studio = await this.studio(studioId);
    const before = await this.bookings.findOne({
      where: { id, studioId },
      relations: this.relations,
    });
    if (!before) throw new NotFoundException('Booking not found');

    await this.withStudioLock(studioId, async (m) => {
      const b = await m.findOneOrFail(Booking, {
        where: { id },
        relations: { equipment: true, package: true },
      });
      const reschedule =
        dto.startsAt !== undefined ||
        dto.endsAt !== undefined ||
        dto.roomId !== undefined ||
        dto.engineerId !== undefined ||
        dto.equipmentIds !== undefined;
      const willBeActive = ACTIVE_STATUSES.includes(dto.status ?? b.status);

      if (reschedule && willBeActive) {
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : b.startsAt;
        const duration = b.endsAt.getTime() - b.startsAt.getTime();
        const r = await this.resolve(
          studio,
          {
            packageId: b.packageId,
            roomId: dto.roomId ?? b.roomId,
            engineerId:
              dto.engineerId === undefined ? b.engineerId : dto.engineerId,
            equipmentIds: dto.equipmentIds ?? b.equipment.map((e) => e.id),
            startsAt,
            endsAt: dto.endsAt
              ? new Date(dto.endsAt)
              : new Date(startsAt.getTime() + duration),
          },
          true,
          m,
          b.id,
        );
        Object.assign(b, {
          roomId: r.room.id,
          engineerId: r.engineer?.id ?? null,
          equipment: r.equipment,
          startsAt: r.startsAt,
          endsAt:
            b.package.pricingType === PricingType.HOURLY && dto.endsAt
              ? new Date(dto.endsAt)
              : r.endsAt,
        });
        if (dto.totalAmount === undefined && (dto.endsAt || dto.equipmentIds)) {
          b.totalAmount = this.price({ ...r, endsAt: b.endsAt });
        }
      } else if (
        dto.status &&
        ACTIVE_STATUSES.includes(dto.status) &&
        !ACTIVE_STATUSES.includes(b.status)
      ) {
        // Re-activating a cancelled booking: make sure the slot is still free.
        const room = await m.findOneOrFail(Room, { where: { id: b.roomId } });
        const engineer = b.engineerId
          ? await m.findOne(User, { where: { id: b.engineerId } })
          : null;
        await this.assertFree(
          studio,
          m,
          {
            room,
            engineer,
            equipment: b.equipment,
            startsAt: b.startsAt,
            endsAt: b.endsAt,
          },
          b.id,
        );
      }

      if (dto.totalAmount !== undefined)
        b.totalAmount = Math.round(dto.totalAmount);
      if (dto.internalNotes !== undefined) b.internalNotes = dto.internalNotes;
      if (dto.projectId !== undefined) b.projectId = dto.projectId;
      if (dto.status && dto.status !== b.status) {
        b.status = dto.status;
        if (dto.status === BookingStatus.CANCELLED) {
          b.cancelledAt = new Date();
          b.cancelReason = dto.cancelReason ?? 'Cancelled by the studio';
        }
      }
      await m.save(b);
    });

    const after = await this.findOne(studioId, id, actor);
    if (after.status !== before.status) {
      void this.notifyStatus(
        studio,
        await this.bookings.findOneOrFail({
          where: { id },
          relations: this.relations,
        }),
      );
    }
    return after;
  }

  /** Clients cancel their own bookings; inside the cancellation window the deposit isn't refundable. */
  async cancelOwn(studioId: string, id: string, client: User, reason?: string) {
    const studio = await this.studio(studioId);
    const b = await this.bookings.findOne({
      where: { id, studioId, clientId: client.id },
      relations: this.relations,
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!ACTIVE_STATUSES.includes(b.status))
      throw new BadRequestException('This booking can no longer be cancelled');
    if (b.startsAt <= new Date())
      throw new BadRequestException('This session has already started');

    const late =
      b.startsAt.getTime() - Date.now() < studio.cancellationHours * 3_600_000;
    b.status = BookingStatus.CANCELLED;
    b.cancelledAt = new Date();
    b.cancelReason = [
      reason?.trim() || 'Cancelled by the client',
      late ? '(inside the cancellation window)' : '',
    ]
      .filter(Boolean)
      .join(' ');
    await this.bookings.save(b);
    void this.notifyStatus(studio, b);
    return {
      ...(await this.findOne(studioId, id, client)),
      lateCancellation: late,
    };
  }

  async remove(studioId: string, id: string, actor: User) {
    if (!hasPermission(actor.role, Permission.BOOKINGS_WRITE))
      throw new ForbiddenException();
    const b = await this.bookings.findOne({
      where: { id, studioId },
      relations: { payments: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.payments.length) {
      throw new BadRequestException(
        'Bookings with payments cannot be deleted — cancel it instead',
      );
    }
    await this.bookings.remove(b);
  }
}
