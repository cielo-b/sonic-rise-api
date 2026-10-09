import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import {
  Booking,
  Invoice,
  LineItem,
  Quote,
  Studio,
  User,
} from '../database/entities';
import {
  InvoiceStatus,
  QuoteStatus,
  Role,
  STAFF_ROLES,
} from '../database/enums';
import { MailService } from '../mail/mail.service';
import {
  CreateInvoiceDto,
  CreateQuoteDto,
  InvoiceFromBookingDto,
  UpdateInvoiceDto,
  UpdateQuoteDto,
} from './dto';
import { bookingReference } from '../bookings/bookings.service';

export const quoteNumber = (n: number) => `Q-${String(n).padStart(4, '0')}`;
export const invoiceNumber = (n: number) => `INV-${String(n).padStart(4, '0')}`;

function totalOf(lines: LineItem[], discount = 0): number {
  const sum = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const total = Math.round(sum - discount);
  if (total < 0)
    throw new BadRequestException('Discount is larger than the total');
  return total;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly mail: MailService,
  ) {}

  private isStaff(u: User) {
    return u.role === Role.PLATFORM_ADMIN || STAFF_ROLES.includes(u.role);
  }

  private async clientIn(studioId: string, clientId: string) {
    const c = await this.users.findOne({
      where: { id: clientId, studioId, role: Role.CLIENT },
    });
    if (!c) throw new BadRequestException('Client not found');
    return c;
  }

  /** Takes the next number for a studio inside a transaction. */
  private async nextNumber(
    m: EntityManager,
    studioId: string,
    field: 'nextQuoteNumber' | 'nextInvoiceNumber',
  ) {
    const studio = await m.findOne(Studio, {
      where: { id: studioId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!studio) throw new NotFoundException('Studio not found');
    const n = studio[field];
    await m.update(Studio, { id: studioId }, { [field]: n + 1 });
    return { n, currency: studio.currency };
  }

  private withNumber<T extends Quote | Invoice>(
    doc: T,
    kind: 'quote' | 'invoice',
  ) {
    return {
      ...doc,
      displayNumber:
        kind === 'quote' ? quoteNumber(doc.number) : invoiceNumber(doc.number),
    };
  }

  private portal(studio: Studio, path: string) {
    return `${this.mail.siteUrl(studio)}/portal/${path}`;
  }

  // ─── Quotes ────────────────────────────────────────────────────────────────
  async listQuotes(studioId: string, viewer: User) {
    const rows = await this.quotes.find({
      where: this.isStaff(viewer)
        ? { studioId }
        : { studioId, clientId: viewer.id, status: Not(QuoteStatus.DRAFT) },
      relations: { client: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((q) => this.withNumber(q, 'quote'));
  }

  async getQuote(studioId: string, id: string, viewer: User) {
    const q = await this.quotes.findOne({
      where: { id, studioId },
      relations: { client: true },
    });
    if (
      !q ||
      (!this.isStaff(viewer) &&
        (q.clientId !== viewer.id || q.status === QuoteStatus.DRAFT))
    ) {
      throw new NotFoundException('Quote not found');
    }
    return this.withNumber(q, 'quote');
  }

  async createQuote(studioId: string, staff: User, dto: CreateQuoteDto) {
    await this.clientIn(studioId, dto.clientId);
    const saved = await this.db.transaction(async (m) => {
      const { n, currency } = await this.nextNumber(
        m,
        studioId,
        'nextQuoteNumber',
      );
      return m.save(
        m.create(Quote, {
          studioId,
          number: n,
          clientId: dto.clientId,
          title: dto.title,
          lines: dto.lines,
          discount: dto.discount ?? 0,
          total: totalOf(dto.lines, dto.discount),
          currency,
          validUntil: dto.validUntil?.slice(0, 10) ?? null,
          notes: dto.notes ?? null,
          createdById: staff.id,
        }),
      );
    });
    return this.getQuote(studioId, saved.id, staff);
  }

  async updateQuote(
    studioId: string,
    id: string,
    staff: User,
    dto: UpdateQuoteDto,
  ) {
    const q = await this.quotes.findOne({ where: { id, studioId } });
    if (!q) throw new NotFoundException('Quote not found');
    if (![QuoteStatus.DRAFT, QuoteStatus.SENT].includes(q.status)) {
      throw new BadRequestException('Only draft or sent quotes can be edited');
    }
    if (dto.clientId) await this.clientIn(studioId, dto.clientId);
    Object.assign(q, {
      ...(dto.clientId && { clientId: dto.clientId }),
      ...(dto.title && { title: dto.title }),
      ...(dto.lines && { lines: dto.lines }),
      ...(dto.discount !== undefined && { discount: dto.discount }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.validUntil !== undefined && {
        validUntil: dto.validUntil?.slice(0, 10) ?? null,
      }),
    });
    q.total = totalOf(q.lines, q.discount);
    await this.quotes.save(q);
    return this.getQuote(studioId, id, staff);
  }

  async sendQuote(studioId: string, id: string, staff: User) {
    const q = await this.quotes.findOne({
      where: { id, studioId },
      relations: { client: true },
    });
    if (!q) throw new NotFoundException('Quote not found');
    if (![QuoteStatus.DRAFT, QuoteStatus.SENT].includes(q.status))
      throw new BadRequestException('Quote already answered');
    q.status = QuoteStatus.SENT;
    await this.quotes.save(q);
    const studio = await this.studios.findOneOrFail({
      where: { id: studioId },
    });
    void this.mail.sendDocument(
      studio,
      q.client.email,
      q.client.name,
      'Quote',
      quoteNumber(q.number),
      q.title,
      q.total,
      q.currency,
      this.portal(studio, `quotes/${q.id}`),
    );
    return this.getQuote(studioId, id, staff);
  }

  async respondToQuote(
    studioId: string,
    id: string,
    client: User,
    accept: boolean,
  ) {
    const q = await this.quotes.findOne({
      where: { id, studioId, clientId: client.id },
    });
    if (!q || q.status !== QuoteStatus.SENT)
      throw new BadRequestException('This quote cannot be answered');
    if (q.validUntil && new Date(`${q.validUntil}T23:59:59Z`) < new Date()) {
      throw new BadRequestException(
        'This quote has expired — ask the studio for a new one',
      );
    }
    q.status = accept ? QuoteStatus.ACCEPTED : QuoteStatus.DECLINED;
    await this.quotes.save(q);
    return this.getQuote(studioId, id, client);
  }

  async convertQuote(
    studioId: string,
    id: string,
    staff: User,
    dueDate?: string,
  ) {
    const q = await this.quotes.findOne({ where: { id, studioId } });
    if (!q) throw new NotFoundException('Quote not found');
    if (q.status === QuoteStatus.CONVERTED)
      throw new BadRequestException('Already converted');
    if (q.status === QuoteStatus.DECLINED)
      throw new BadRequestException('The client declined this quote');
    const invoice = await this.db.transaction(async (m) => {
      const { n } = await this.nextNumber(m, studioId, 'nextInvoiceNumber');
      const inv = await m.save(
        m.create(Invoice, {
          studioId,
          number: n,
          clientId: q.clientId,
          quoteId: q.id,
          title: q.title,
          lines: q.lines,
          discount: q.discount,
          total: q.total,
          currency: q.currency,
          status: InvoiceStatus.DRAFT,
          dueDate: dueDate?.slice(0, 10) ?? null,
          notes: q.notes,
          createdById: staff.id,
        }),
      );
      await m.update(
        Quote,
        { id: q.id },
        { status: QuoteStatus.CONVERTED, invoiceId: inv.id },
      );
      return inv;
    });
    return this.getInvoice(studioId, invoice.id, staff);
  }

  async deleteQuote(studioId: string, id: string) {
    const q = await this.quotes.findOne({ where: { id, studioId } });
    if (!q) throw new NotFoundException('Quote not found');
    if (q.status !== QuoteStatus.DRAFT)
      throw new BadRequestException('Only drafts can be deleted');
    await this.quotes.remove(q);
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────
  async listInvoices(studioId: string, viewer: User) {
    const rows = await this.invoices.find({
      where: this.isStaff(viewer)
        ? { studioId }
        : {
            studioId,
            clientId: viewer.id,
            status: Not(In([InvoiceStatus.DRAFT, InvoiceStatus.VOID])),
          },
      relations: { client: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((i) => this.withNumber(i, 'invoice'));
  }

  async getInvoice(studioId: string, id: string, viewer: User) {
    const inv = await this.invoices.findOne({
      where: { id, studioId },
      relations: { client: true },
    });
    if (
      !inv ||
      (!this.isStaff(viewer) &&
        (inv.clientId !== viewer.id || inv.status === InvoiceStatus.DRAFT))
    ) {
      throw new NotFoundException('Invoice not found');
    }
    return this.withNumber(inv, 'invoice');
  }

  async createInvoice(studioId: string, staff: User, dto: CreateInvoiceDto) {
    await this.clientIn(studioId, dto.clientId);
    const saved = await this.db.transaction(async (m) => {
      const { n, currency } = await this.nextNumber(
        m,
        studioId,
        'nextInvoiceNumber',
      );
      return m.save(
        m.create(Invoice, {
          studioId,
          number: n,
          clientId: dto.clientId,
          bookingId: dto.bookingId ?? null,
          projectId: dto.projectId ?? null,
          title: dto.title,
          lines: dto.lines,
          discount: dto.discount ?? 0,
          total: totalOf(dto.lines, dto.discount),
          currency,
          dueDate: dto.dueDate?.slice(0, 10) ?? null,
          notes: dto.notes ?? null,
          createdById: staff.id,
        }),
      );
    });
    return this.getInvoice(studioId, saved.id, staff);
  }

  /** An invoice for the unpaid part of a booking. */
  async invoiceFromBooking(
    studioId: string,
    staff: User,
    dto: InvoiceFromBookingDto,
  ) {
    const b = await this.bookings.findOne({
      where: { id: dto.bookingId, studioId },
      relations: { package: true, room: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!b.clientId)
      throw new BadRequestException(
        'Walk-in bookings need a client account to invoice',
      );
    const due = b.totalAmount - b.amountPaid;
    if (due <= 0) throw new BadRequestException('This booking is fully paid');
    const lines: LineItem[] = [
      {
        description: `${b.package.name} — ${b.room.name}`,
        quantity: 1,
        unitPrice: b.totalAmount,
      },
    ];
    const discount = b.amountPaid; // already paid (deposit) is deducted
    return this.createInvoice(studioId, staff, {
      clientId: b.clientId,
      bookingId: b.id,
      projectId: b.projectId ?? undefined,
      title: `Session ${bookingReference(b.id)}`,
      lines,
      discount,
      dueDate: dto.dueDate,
      notes:
        discount > 0
          ? `Includes ${discount} ${b.currency} already paid.`
          : undefined,
    });
  }

  async updateInvoice(
    studioId: string,
    id: string,
    staff: User,
    dto: UpdateInvoiceDto,
  ) {
    const inv = await this.invoices.findOne({ where: { id, studioId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== InvoiceStatus.DRAFT)
      throw new BadRequestException('Only drafts can be edited');
    if (dto.clientId) await this.clientIn(studioId, dto.clientId);
    Object.assign(inv, {
      ...(dto.clientId && { clientId: dto.clientId }),
      ...(dto.title && { title: dto.title }),
      ...(dto.lines && { lines: dto.lines }),
      ...(dto.discount !== undefined && { discount: dto.discount }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.dueDate !== undefined && {
        dueDate: dto.dueDate?.slice(0, 10) ?? null,
      }),
    });
    inv.total = totalOf(inv.lines, inv.discount);
    await this.invoices.save(inv);
    return this.getInvoice(studioId, id, staff);
  }

  async issueInvoice(studioId: string, id: string, staff: User) {
    const inv = await this.invoices.findOne({
      where: { id, studioId },
      relations: { client: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== InvoiceStatus.DRAFT)
      throw new BadRequestException('Invoice already issued');
    inv.status = inv.total <= 0 ? InvoiceStatus.PAID : InvoiceStatus.ISSUED;
    inv.issuedAt = new Date();
    await this.invoices.save(inv);
    const studio = await this.studios.findOneOrFail({
      where: { id: studioId },
    });
    void this.mail.sendDocument(
      studio,
      inv.client.email,
      inv.client.name,
      'Invoice',
      invoiceNumber(inv.number),
      inv.title,
      inv.total,
      inv.currency,
      this.portal(studio, `invoices/${inv.id}`),
    );
    return this.getInvoice(studioId, id, staff);
  }

  async voidInvoice(studioId: string, id: string, staff: User) {
    const inv = await this.invoices.findOne({ where: { id, studioId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.amountPaid > 0)
      throw new BadRequestException('Invoices with payments cannot be voided');
    inv.status = InvoiceStatus.VOID;
    await this.invoices.save(inv);
    return this.getInvoice(studioId, id, staff);
  }
}
