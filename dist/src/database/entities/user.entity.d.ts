import { Role } from '../enums';
import { Booking } from './booking.entity';
export declare class User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string;
    role: Role;
    isActive: boolean;
    avatarUrl: string | null;
    company: string | null;
    category: string | null;
    notes: string | null;
    inviteToken: string | null;
    inviteExpiry: Date | null;
    otpHash: string | null;
    otpExpiry: Date | null;
    resetToken: string | null;
    resetTokenExpiry: Date | null;
    twoFaSecret: string | null;
    twoFaEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    bookings: Promise<Booking[]>;
}
