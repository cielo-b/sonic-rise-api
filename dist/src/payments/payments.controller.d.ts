import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Role } from '../database/enums';
interface AuthUser {
    id: string;
    role: Role;
}
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    initiate(user: AuthUser, dto: CreatePaymentDto): Promise<import("../database/entities").Payment>;
    findAll(user: AuthUser): Promise<import("../database/entities").Payment[]>;
    findByBooking(bookingId: string): Promise<import("../database/entities").Payment[]>;
}
export {};
