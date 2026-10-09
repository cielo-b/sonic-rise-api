import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, User } from '../database/entities';
import { BookingStatus, Role } from '../database/enums';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mail: MailService,
  ) {}

  async create(
    clientId: string | undefined,
    dto: CreateBookingDto,
    role?: Role,
  ): Promise<Booking> {
    let finalClientId: string | null = clientId || null;
    let finalGuestName: string | null = null;
    let finalGuestEmail: string | null = null;

    const isAdminOrStaff = role === Role.SUPERADMIN;

    if (isAdminOrStaff && dto.clientId) {
      finalClientId = dto.clientId;
    } else if (
      isAdminOrStaff &&
      !dto.clientId &&
      dto.guestEmail &&
      dto.guestName
    ) {
      finalClientId = null;
      finalGuestName = dto.guestName;
      finalGuestEmail = dto.guestEmail;
    }

    const booking = this.bookingRepo.create({
      clientId: finalClientId,
      guestName: finalGuestName,
      guestEmail: finalGuestEmail,
      serviceType: dto.serviceType,
      dateTime: new Date(dto.dateTime),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      totalAmount: dto.totalAmount,
      notes: dto.notes ?? null,
    });
    const saved = await this.bookingRepo.save(booking);

    // Send confirmation email — fire and forget, don't block the response
    if (finalClientId) {
      this.userRepo
        .findOne({ where: { id: finalClientId } })
        .then((client) => {
          if (!client) return;
          this.mail
            .sendBookingConfirmation(client.email, client.name, {
              id: saved.id,
              serviceType: saved.serviceType,
              dateTime: saved.dateTime,
              totalAmount: saved.totalAmount,
              currency: saved.currency,
              notes: saved.notes,
            })
            .catch(() => {});
        })
        .catch(() => {});
    } else if (finalGuestEmail && finalGuestName) {
      this.mail
        .sendBookingConfirmation(finalGuestEmail, finalGuestName, {
          id: saved.id,
          serviceType: saved.serviceType,
          dateTime: saved.dateTime,
          totalAmount: saved.totalAmount,
          currency: saved.currency,
          notes: saved.notes,
        })
        .catch(() => {});
    }

    return saved;
  }

  findAll(clientId: string, role: Role): Promise<Booking[]> {
    const where = role === Role.CLIENT ? { clientId } : {};
    return this.bookingRepo.find({
      where,
      relations: { client: true, payments: true },
      order: { dateTime: 'DESC' },
    });
  }

  async findOne(id: string, clientId: string, role: Role): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: { client: true, payments: true },
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (role === Role.CLIENT && booking.clientId !== clientId) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  async update(
    id: string,
    dto: UpdateBookingDto,
    clientId: string,
    role: Role,
  ): Promise<Booking> {
    const booking = await this.findOne(id, clientId, role);
    const prevStatus = booking.status;

    if (role === Role.CLIENT) {
      if (dto.status && dto.status !== BookingStatus.CANCELLED) {
        throw new BadRequestException('Clients may only cancel their bookings');
      }
      delete dto.internalNotes;
    }

    Object.assign(booking, {
      ...dto,
      guestName:
        dto.guestName !== undefined ? dto.guestName : booking.guestName,
      guestEmail:
        dto.guestEmail !== undefined ? dto.guestEmail : booking.guestEmail,
      dateTime: dto.dateTime ? new Date(dto.dateTime) : booking.dateTime,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : booking.endsAt,
    });

    const saved = await this.bookingRepo.save(booking);

    // Send email when status transitions to CONFIRMED or CANCELLED
    const notifyStatuses = [BookingStatus.CONFIRMED, BookingStatus.CANCELLED];
    if (
      dto.status &&
      dto.status !== prevStatus &&
      notifyStatuses.includes(saved.status)
    ) {
      if (saved.clientId) {
        // Registered client booking — look up the booking's actual client, not the admin
        this.userRepo
          .findOne({ where: { id: saved.clientId } })
          .then((client) => {
            if (!client) return;
            this.mail
              .sendBookingStatusUpdate(
                client.email,
                client.name,
                saved.status,
                saved.id,
              )
              .catch(() => {});
          })
          .catch(() => {});
      } else if (saved.guestEmail && saved.guestName) {
        // Guest booking — use the stored guest details
        this.mail
          .sendBookingStatusUpdate(
            saved.guestEmail,
            saved.guestName,
            saved.status,
            saved.id,
          )
          .catch(() => {});
      }
    }

    return saved;
  }

  async remove(id: string, clientId: string, role: Role): Promise<void> {
    const booking = await this.findOne(id, clientId, role);
    if (role === Role.CLIENT) {
      throw new BadRequestException(
        'Clients cannot delete bookings permanently',
      );
    }
    await this.bookingRepo.remove(booking);
  }
}
