import { BookingStatus, ServiceType } from '../enums';
import { User } from './user.entity';
import { Payment } from './payment.entity';
export declare class Booking {
    id: string;
    clientId: string | null;
    guestName: string | null;
    guestEmail: string | null;
    serviceType: ServiceType;
    dateTime: Date;
    endsAt: Date | null;
    status: BookingStatus;
    totalAmount: number;
    currency: string;
    notes: string | null;
    internalNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    client: User | null;
    payments: Promise<Payment[]>;
}
