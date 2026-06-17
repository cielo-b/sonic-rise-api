import { BookingStatus, ServiceType } from '../../database/enums';
export declare class UpdateBookingDto {
    status?: BookingStatus;
    dateTime?: string;
    endsAt?: string;
    notes?: string;
    internalNotes?: string;
    serviceType?: ServiceType;
    totalAmount?: number;
    guestName?: string;
    guestEmail?: string;
}
