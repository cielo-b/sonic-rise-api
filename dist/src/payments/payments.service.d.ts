import { Repository } from 'typeorm';
import { Payment, Booking } from '../database/entities';
import { Role } from '../database/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsService {
    private readonly paymentRepo;
    private readonly bookingRepo;
    constructor(paymentRepo: Repository<Payment>, bookingRepo: Repository<Booking>);
    initiate(clientId: string, dto: CreatePaymentDto): Promise<Payment>;
    handleWebhook(transactionReference: string, success: boolean, gatewayData: Record<string, unknown>): Promise<void>;
    findByBooking(bookingId: string): Promise<Payment[]>;
    findAll(clientId: string, role: Role): Promise<Payment[]>;
}
