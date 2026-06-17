import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, Booking } from '../database/entities';
import { PaymentStatus, Role } from '../database/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async initiate(clientId: string, dto: CreatePaymentDto): Promise<Payment> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientId) throw new NotFoundException('Booking not found');

    const existing = await this.paymentRepo.findOne({
      where: { bookingId: dto.bookingId, status: PaymentStatus.SUCCESS },
    });
    if (existing) throw new BadRequestException('Booking is already paid');

    const payment = this.paymentRepo.create({
      bookingId:     dto.bookingId,
      amount:        dto.amount,
      paymentMethod: dto.paymentMethod,
      status:        PaymentStatus.PENDING,
    });
    return this.paymentRepo.save(payment);
  }

  /** Called by the payment gateway webhook handler. */
  async handleWebhook(
    transactionReference: string,
    success: boolean,
    gatewayData: Record<string, unknown>,
  ): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { transactionReference },
    });
    if (!payment) return;

    payment.status          = success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    payment.gatewayResponse = gatewayData;
    payment.paidAt          = success ? new Date() : null;
    await this.paymentRepo.save(payment);
  }

  findByBooking(bookingId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
  }

  findAll(clientId: string, role: Role): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: role === Role.CLIENT
        ? { booking: { clientId } }
        : {},
      relations: { booking: true },
      order:     { createdAt: 'DESC' },
    });
  }
}
