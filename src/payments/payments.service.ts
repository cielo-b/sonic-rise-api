import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Booking,
  Deliverable,
  Invoice,
  Payment,
  Project,
  Studio,
  User,
} from '../database/entities';
import {
  BookingStatus,
  DeliverableStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Role,
  STAFF_ROLES,
} from '../database/enums';
import { decryptSecret } from '../common/crypto';
import { hasPermission, Permission } from '../common/permissions';
import { MailService } from '../mail/mail.service';
import {
  PawapayClient,
  PawapayDeposit,
  customerMessage,
} from './pawapay.client';
import { InitiatePaymentDto, ListPaymentsQuery, RecordPaymentDto } from './dto';
import { bookingReference } from '../bookings/bookings.service';

interface Target {
  amountDue: number;
  currency: string;
  payerId: string | null;
  bookingId?: string;
  invoiceId?: string;
  deliverableId?: string;
  reference: string;
  label: string;
}

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly mail: MailService,
  ) {}

  private isStaff(user: User) {
    return user.role === Role.PLATFORM_ADMIN || STAFF_ROLES.includes(user.role);
  }

  private async client(
    studioId: string,
  ): Promise<{ studio: Studio; api: PawapayClient }> {
    const studio = await this.studios
      .createQueryBuilder('s')
      .addSelect('s.pawapayApiTokenEnc')
      .where('s.id = :id', { id: studioId })
      .getOne();
    if (!studio) throw new NotFoundException('Studio not found');
    if (!studio.pawapayApiTokenEnc) {
      throw new BadRequestException(
        'Online payments are not set up for this studio yet — please pay at the studio',
      );
    }
    return {
      studio,
      api: new PawapayClient(
        decryptSecret(studio.pawapayApiTokenEnc),
        studio.pawapaySandbox,
      ),
    };
  }

  /**
   * What is owed for a payment target. Clients can only pay their own things;
   * staff (manual payments) can pay for anyone in the studio.
   */
  private async target(
    m: EntityManager,
    studioId: string,
    purpose: PaymentPurpose,
    targetId: string,
    actor: User | null,
  ): Promise<Target> {
    const ownerCheck = (ownerId: string | null) => {
      if (actor && !this.isStaff(actor) && ownerId !== actor.id)
        throw new NotFoundException('Not found');
    };
    switch (purpose) {
      case PaymentPurpose.DEPOSIT:
      case PaymentPurpose.BOOKING_BALANCE: {
        const b = await m.findOne(Booking, {
          where: { id: targetId, studioId },
          relations: { package: true },
        });
        if (!b) throw new NotFoundException('Booking not found');
        ownerCheck(b.clientId);
        if (
          [BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(b.status)
        ) {
          throw new BadRequestException('This booking is not payable');
        }
        const due =
          purpose === PaymentPurpose.DEPOSIT
            ? Math.max(0, b.depositAmount - b.amountPaid)
            : Math.max(0, b.totalAmount - b.amountPaid);
        return {
          amountDue: due,
          currency: b.currency,
          payerId: b.clientId,
          bookingId: b.id,
          reference: bookingReference(b.id),
          label: `${b.package.name} (${bookingReference(b.id)})`,
        };
      }
      case PaymentPurpose.INVOICE: {
        const inv = await m.findOne(Invoice, {
          where: { id: targetId, studioId },
        });
        if (!inv) throw new NotFoundException('Invoice not found');
        ownerCheck(inv.clientId);
        if (
          ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID].includes(
            inv.status,
          )
        ) {
          throw new BadRequestException('This invoice is not payable');
        }
        const ref = `INV-${String(inv.number).padStart(4, '0')}`;
        return {
          amountDue: Math.max(0, inv.total - inv.amountPaid),
          currency: inv.currency,
          payerId: inv.clientId,
          invoiceId: inv.id,
          reference: ref,
          label: `invoice ${ref}`,
        };
      }
      case PaymentPurpose.DELIVERABLE: {
        const d = await m.findOne(Deliverable, {
          where: { id: targetId, studioId },
        });
        if (!d) throw new NotFoundException('File not found');
        const project = await m.findOneOrFail(Project, {
          where: { id: d.projectId },
        });
        ownerCheck(project.clientId);
        if (d.status !== DeliverableStatus.APPROVED)
          throw new BadRequestException('Approve the file before paying');
        if (d.isPaid || d.price <= 0)
          throw new BadRequestException('Nothing to pay for this file');
        return {
          amountDue: d.price,
          currency: d.currency,
          payerId: project.clientId,
          deliverableId: d.id,
          reference: `FILE-${d.id.slice(0, 8).toUpperCase()}`,
          label: `"${d.title}"`,
        };
      }
    }
  }

  // ─── Mobile money ──────────────────────────────────────────────────────────
  async initiate(studioId: string, actor: User, dto: InitiatePaymentDto) {
    const { studio, api } = await this.client(studioId);
    const t = await this.target(
      this.db.manager,
      studioId,
      dto.purpose,
      dto.targetId,
      actor,
    );
    if (t.amountDue <= 0) throw new BadRequestException('Nothing is due');

    const predicted = await api.predictProvider(dto.phone);
    const depositId = randomUUID();
    const payment = await this.payments.save(
      this.payments.create({
        studioId,
        purpose: dto.purpose,
        bookingId: t.bookingId ?? null,
        invoiceId: t.invoiceId ?? null,
        deliverableId: t.deliverableId ?? null,
        payerId: t.payerId ?? actor.id,
        amount: t.amountDue,
        currency: t.currency,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.PAWAPAY,
        method: PaymentMethod.MOBILE_MONEY,
        phone: predicted.phoneNumber,
        transactionReference: depositId,
      }),
    );

    const res = await api.initiateDeposit({
      depositId,
      phoneNumber: predicted.phoneNumber,
      provider: predicted.provider,
      // RWF has no decimals at Rwandan operators.
      amount: String(Math.round(t.amountDue)),
      currency: t.currency,
      customerMessage: customerMessage(studio.name),
      clientReferenceId: t.reference,
    });
    if (res.status === 'REJECTED') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason =
        res.failureReason?.failureMessage ??
        res.failureReason?.failureCode ??
        'Rejected';
      payment.gatewayResponse = res;
      await this.payments.save(payment);
      throw new BadRequestException(
        `Payment could not be started: ${payment.failureReason}`,
      );
    }
    return { ...this.view(payment), provider: predicted.provider };
  }

  /**
   * pawaPay callback. The body is only used for the deposit id — the status is
   * always fetched from pawaPay with the studio's own token, so a forged
   * callback can't mark anything as paid.
   */
  async handleCallback(body: { depositId?: string }) {
    if (!body?.depositId) return { ok: true };
    const payment = await this.payments.findOne({
      where: { transactionReference: body.depositId },
    });
    if (!payment) return { ok: true };
    await this.refresh(payment);
    return { ok: true };
  }

  /** Polls pawaPay for a pending payment and applies the result. */
  private async refresh(payment: Payment): Promise<Payment> {
    if (
      payment.status !== PaymentStatus.PENDING ||
      payment.provider !== PaymentProvider.PAWAPAY
    )
      return payment;
    const { api } = await this.client(payment.studioId);
    const deposit = await api.getDeposit(payment.transactionReference!);
    if (!deposit) return payment;
    return this.apply(payment.id, deposit);
  }

  private async apply(
    paymentId: string,
    deposit: PawapayDeposit,
  ): Promise<Payment> {
    if (!['COMPLETED', 'FAILED'].includes(deposit.status)) {
      return this.payments.findOneOrFail({ where: { id: paymentId } });
    }
    const result = await this.db.transaction(async (m) => {
      const p = await m.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p || p.status !== PaymentStatus.PENDING)
        return { payment: p!, changed: false };
      p.gatewayResponse = deposit as unknown as Record<string, unknown>;
      if (deposit.status === 'COMPLETED') {
        // Trust pawaPay's amount, not ours.
        p.amount = Math.round(parseFloat(deposit.amount));
        p.status = PaymentStatus.SUCCESS;
        p.paidAt = new Date();
        await m.save(p);
        await this.credit(m, p);
      } else {
        p.status = PaymentStatus.FAILED;
        p.failureReason =
          deposit.failureReason?.failureMessage ??
          deposit.failureReason?.failureCode ??
          'Failed';
        await m.save(p);
      }
      return { payment: p, changed: true };
    });
    if (result.changed && result.payment.status === PaymentStatus.SUCCESS)
      void this.sendReceipt(result.payment);
    return result.payment;
  }

  /** Adds a successful payment to what it was for. */
  private async credit(m: EntityManager, p: Payment) {
    if (p.bookingId) {
      const b = await m.findOne(Booking, {
        where: { id: p.bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (b) {
        b.amountPaid += p.amount;
        if (
          b.status === BookingStatus.PENDING_DEPOSIT &&
          b.amountPaid >= b.depositAmount
        ) {
          b.status = BookingStatus.PENDING;
        }
        await m.save(b);
      }
    }
    if (p.invoiceId) {
      const inv = await m.findOne(Invoice, {
        where: { id: p.invoiceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (inv) {
        inv.amountPaid += p.amount;
        inv.status =
          inv.amountPaid >= inv.total
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID;
        await m.save(inv);
      }
    }
    if (p.deliverableId) {
      await m.update(Deliverable, { id: p.deliverableId }, { isPaid: true });
    }
  }

  private async sendReceipt(p: Payment) {
    const payer = p.payerId
      ? await this.users.findOne({ where: { id: p.payerId } })
      : null;
    const studio = await this.studios.findOne({ where: { id: p.studioId } });
    if (!payer || !studio) return;
    const what =
      p.purpose === PaymentPurpose.DEPOSIT
        ? 'your booking deposit'
        : p.purpose === PaymentPurpose.BOOKING_BALANCE
          ? 'your booking'
          : p.purpose === PaymentPurpose.INVOICE
            ? 'your invoice'
            : 'your file';
    await this.mail.sendPaymentReceipt(
      studio,
      payer.email,
      payer.name,
      p.amount,
      p.currency,
      what,
      `${this.mail.siteUrl(studio)}/portal`,
    );
  }

  // ─── Manual (desk) payments ────────────────────────────────────────────────
  async record(studioId: string, staff: User, dto: RecordPaymentDto) {
    if (!hasPermission(staff.role, Permission.FINANCE_WRITE))
      throw new ForbiddenException();
    const payment = await this.db.transaction(async (m) => {
      const t = await this.target(
        m,
        studioId,
        dto.purpose,
        dto.targetId,
        staff,
      );
      if (
        dto.amount > t.amountDue &&
        dto.purpose !== PaymentPurpose.DELIVERABLE
      ) {
        throw new BadRequestException(
          `Only ${t.amountDue} ${t.currency} is due`,
        );
      }
      const p = await m.save(
        m.create(Payment, {
          studioId,
          purpose: dto.purpose,
          bookingId: t.bookingId ?? null,
          invoiceId: t.invoiceId ?? null,
          deliverableId: t.deliverableId ?? null,
          payerId: t.payerId,
          amount: Math.round(dto.amount),
          currency: t.currency,
          status: PaymentStatus.SUCCESS,
          provider: PaymentProvider.MANUAL,
          method: dto.method,
          paidAt: new Date(),
          recordedById: staff.id,
          note: dto.note ?? null,
        }),
      );
      await this.credit(m, p);
      return p;
    });
    void this.sendReceipt(payment);
    return this.view(payment);
  }

  // ─── Read ──────────────────────────────────────────────────────────────────
  private view(p: Payment) {
    const { gatewayResponse: _g, ...rest } = p;
    return rest;
  }

  async list(studioId: string, viewer: User, q: ListPaymentsQuery) {
    const where: FindOptionsWhere<Payment> = { studioId };
    if (!this.isStaff(viewer)) where.payerId = viewer.id;
    else if (!hasPermission(viewer.role, Permission.FINANCE_READ))
      throw new ForbiddenException();
    if (q.status) where.status = q.status;
    if (q.purpose) where.purpose = q.purpose;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.invoiceId) where.invoiceId = q.invoiceId;
    if (q.from && q.to)
      where.createdAt = Between(new Date(q.from), new Date(q.to));
    const rows = await this.payments.find({
      where,
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return rows.map((p) => this.view(p));
  }

  /** Status of one payment; pending mobile money payments are re-checked with pawaPay. */
  async status(studioId: string, id: string, viewer: User) {
    let p = await this.payments.findOne({ where: { id, studioId } });
    if (!p || (!this.isStaff(viewer) && p.payerId !== viewer.id))
      throw new NotFoundException('Payment not found');
    try {
      p = await this.refresh(p);
    } catch (err) {
      this.log.warn(
        `Could not refresh payment ${id}: ${(err as Error).message}`,
      );
    }
    return this.view(p);
  }
}
