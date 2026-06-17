import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Role } from '../database/enums';
interface AuthUser {
    id: string;
    role: Role;
}
export declare class BookingsController {
    private bookingsService;
    constructor(bookingsService: BookingsService);
    create(user: AuthUser, dto: CreateBookingDto): Promise<import("../database/entities").Booking>;
    findAll(user: AuthUser): Promise<import("../database/entities").Booking[]>;
    findOne(id: string, user: AuthUser): Promise<import("../database/entities").Booking>;
    update(id: string, dto: UpdateBookingDto, user: AuthUser): Promise<import("../database/entities").Booking>;
    remove(id: string, user: AuthUser): Promise<void>;
}
export {};
