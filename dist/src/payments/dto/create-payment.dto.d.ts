import { PaymentMethod } from '../../database/enums';
export declare class CreatePaymentDto {
    bookingId: string;
    paymentMethod: PaymentMethod;
    amount: number;
}
