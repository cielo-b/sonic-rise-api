import { ServiceType } from '../../database/enums';
export declare class CreateBookingDto {
    serviceType: ServiceType;
    dateTime: string;
    endsAt?: string;
    totalAmount: number;
    notes?: string;
    clientId?: string;
    guestName?: string;
    guestEmail?: string;
}
