import { Repository } from 'typeorm';
import { Booking, User } from '../database/entities';
import { Role } from '../database/enums';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { MailService } from '../mail/mail.service';
export declare class BookingsService {
    private readonly bookingRepo;
    private readonly userRepo;
    private readonly mail;
    constructor(bookingRepo: Repository<Booking>, userRepo: Repository<User>, mail: MailService);
    create(clientId: string | undefined, dto: CreateBookingDto, role?: Role): Promise<Booking>;
    findAll(clientId: string, role: Role): Promise<Booking[]>;
    findOne(id: string, clientId: string, role: Role): Promise<Booking>;
    update(id: string, dto: UpdateBookingDto, clientId: string, role: Role): Promise<Booking>;
    remove(id: string, clientId: string, role: Role): Promise<void>;
}
