import { PaymentMethod, PaymentStatus } from '../enums';
import { Booking } from './booking.entity';
export declare class Payment {
    id: string;
    bookingId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    transactionReference: string | null;
    gatewayResponse: Record<string, unknown> | null;
    paidAt: Date | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    booking: Booking;
}
