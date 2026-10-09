import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Studio } from '../database/entities';

/** Escapes user-supplied text before it is interpolated into email HTML. */
export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow plain hex colours from studio branding into inline styles. */
function safeColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

interface Row {
  label: string;
  value: string;
}

interface MailParts {
  to: string;
  subject: string;
  preheader: string;
  heading: string;
  /** Plain text paragraphs (escaped here). */
  paragraphs?: string[];
  rows?: Row[];
  button?: { label: string; url: string };
  /** Small print under the button (escaped here). */
  footnote?: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
  ) {
    this.from = config.getOrThrow<string>('EMAIL_FROM');
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('EMAIL_HOST'),
      port: config.get<number>('EMAIL_PORT', 587),
      secure: config.get<string>('EMAIL_SECURE') === 'true',
      auth: {
        user: config.getOrThrow<string>('EMAIL_USER'),
        pass: config.getOrThrow<string>('EMAIL_PASSWORD'),
      },
    });
  }

  // ─── Shared ────────────────────────────────────────────────────────────────
  /** Public website of a studio: its subdomain, or FRONTEND_URL for single-studio setups. */
  siteUrl(studio: Studio | null): string {
    const base = this.config.get<string>('BASE_DOMAIN');
    if (studio && base) {
      const scheme = this.config.get<string>('SITE_SCHEME', 'https');
      return `${scheme}://${studio.slug}.${base}`;
    }
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private async studio(studioId: string | null): Promise<Studio | null> {
    return studioId ? this.studios.findOne({ where: { id: studioId } }) : null;
  }

  private render(studio: Studio | null, parts: MailParts): string {
    const name = esc(studio?.name ?? 'Studio Platform');
    const primary = safeColor(studio?.primaryColor, '#7C3AED');
    const accent = safeColor(studio?.accentColor, '#3CD7FF');
    const site = this.siteUrl(studio);
    const contact = [
      studio?.address,
      studio?.city,
      studio?.phone,
      studio?.email,
    ]
      .filter(Boolean)
      .map((v) => esc(v))
      .join(' · ');

    const paragraphs = (parts.paragraphs ?? [])
      .map(
        (p) =>
          `<p style="color:#C8C5CB;font-size:15px;margin:0 0 16px;line-height:1.6;white-space:pre-wrap">${esc(p)}</p>`,
      )
      .join('');
    const rows = parts.rows?.length
      ? `<table style="width:100%;border-collapse:collapse;background:#1B1B23;border:1px solid #2D2D38;border-radius:12px;margin:8px 0 24px">${parts.rows
          .map(
            (r) =>
              `<tr><td style="padding:10px 16px;color:#929095;font-size:13px;width:140px;border-bottom:1px solid #2D2D38">${esc(r.label)}</td><td style="padding:10px 16px;font-size:14px;color:#E4E1EC;border-bottom:1px solid #2D2D38">${esc(r.value)}</td></tr>`,
          )
          .join('')}</table>`
      : '';
    const button = parts.button
      ? `<div style="text-align:center;margin:24px 0"><a href="${esc(parts.button.url)}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600">${esc(parts.button.label)}</a></div>`
      : '';
    const footnote = parts.footnote
      ? `<p style="color:#6B6A70;font-size:12px;margin:0;line-height:1.6;white-space:pre-wrap">${esc(parts.footnote)}</p>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${name}</title></head>
<body style="margin:0;padding:32px 16px;background:#08080C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(parts.preheader)}</span>
<div style="max-width:520px;margin:0 auto;background:#0D0E15;color:#E4E1EC;border-radius:20px;overflow:hidden;border:1px solid #1F1F27">
  <div style="height:5px;background:linear-gradient(90deg,${primary},${accent})"></div>
  <div style="padding:40px 32px 32px">
    <div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:28px">${name}</div>
    <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#ffffff">${esc(parts.heading)}</h2>
    ${paragraphs}${rows}${button}${footnote}
  </div>
  <div style="background:#0A0A0F;padding:20px 32px;border-top:1px solid #1F1F27;text-align:center">
    ${contact ? `<p style="margin:0 0 8px;font-size:12px;color:#929095">${contact}</p>` : ''}
    <a href="${esc(site)}" style="color:${accent};text-decoration:none;font-size:12px">${esc(site.replace(/^https?:\/\//, ''))}</a>
  </div>
</div></body></html>`;
  }

  private async send(
    studio: Studio | null,
    parts: MailParts,
    opts: { rethrow?: boolean } = {},
  ) {
    try {
      await this.transporter.sendMail({
        from: `"${(studio?.name ?? 'Studio Platform').replace(/"/g, '')}" <${this.from}>`,
        to: parts.to,
        replyTo: parts.replyTo ?? studio?.email ?? undefined,
        subject: parts.subject,
        html: this.render(studio, parts),
      });
    } catch (err) {
      this.log.error(
        `Failed to send "${parts.subject}" to ${parts.to}`,
        err as Error,
      );
      if (opts.rethrow) throw err;
    }
  }

  private formatDateTime(studio: Studio | null, date: Date): string {
    return date.toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: studio?.timezone ?? 'Africa/Kigali',
    });
  }

  money(amount: number, currency: string): string {
    return `${Math.round(amount).toLocaleString('en-US')} ${currency}`;
  }

  // ─── Accounts ──────────────────────────────────────────────────────────────
  /** Returns the invite link so staff can also share it directly. */
  async sendInvite(
    studioId: string,
    to: string,
    inviteToken: string,
  ): Promise<string> {
    const studio = await this.studio(studioId);
    const link = `${this.siteUrl(studio)}/accept-invite?token=${inviteToken}`;
    await this.send(studio, {
      to,
      subject: `You're invited to join ${studio?.name ?? 'the team'}`,
      preheader: 'Set up your team account',
      heading: "You've been invited",
      paragraphs: [
        `You have been invited to join the ${studio?.name ?? ''} team. Set your password to activate your account.`,
      ],
      button: { label: 'Accept invitation', url: link },
      footnote:
        "This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.",
    });
    return link;
  }

  async sendOtp(
    studioId: string | null,
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const studio = await this.studio(studioId);
    await this.send(studio, {
      to,
      subject: `Your password reset code: ${otp}`,
      preheader: 'Your password reset code',
      heading: `Hi ${name},`,
      paragraphs: [
        'Use this code to reset your password. It expires in 10 minutes.',
        otp,
      ],
      footnote:
        "If you didn't ask to reset your password, ignore this email — your account is safe.",
    });
  }

  // ─── Website ───────────────────────────────────────────────────────────────
  async sendInquiry(
    studio: Studio,
    data: {
      name: string;
      email: string;
      phone?: string | null;
      subject?: string | null;
      message: string;
    },
  ) {
    await this.send(
      studio,
      {
        to: studio.email ?? this.from,
        replyTo: data.email,
        subject: `[Website] ${data.subject || 'New message'} — ${data.name}`,
        preheader: `New message from ${data.name}`,
        heading: 'New message from your website',
        rows: [
          { label: 'Name', value: data.name },
          { label: 'Email', value: data.email },
          { label: 'Phone', value: data.phone || '—' },
          { label: 'Subject', value: data.subject || '—' },
        ],
        paragraphs: [data.message],
      },
      { rethrow: true },
    );
  }

  // ─── Bookings ──────────────────────────────────────────────────────────────
  async sendBookingReceived(
    studio: Studio,
    to: string,
    name: string,
    b: {
      reference: string;
      packageName: string;
      roomName: string;
      startsAt: Date;
      total: number;
      deposit: number;
      currency: string;
    },
    portalUrl: string,
  ) {
    const rules = studio.content?.rules?.filter(Boolean) ?? [];
    await this.send(studio, {
      to,
      subject: `Booking request received — ${b.packageName}`,
      preheader: 'Your booking request has been received',
      heading: `Thanks, ${name}`,
      paragraphs: [
        b.deposit > 0
          ? `We've received your booking request. Pay the deposit of ${this.money(b.deposit, b.currency)} to hold your slot.`
          : `We've received your booking request. The team will confirm it shortly.`,
      ],
      rows: [
        { label: 'Reference', value: b.reference },
        { label: 'Service', value: b.packageName },
        { label: 'Room', value: b.roomName },
        {
          label: 'Date & time',
          value: this.formatDateTime(studio, b.startsAt),
        },
        { label: 'Total', value: this.money(b.total, b.currency) },
      ],
      button: { label: 'View my booking', url: portalUrl },
      footnote: [...rules, studio.cancellationPolicy ?? '']
        .filter(Boolean)
        .join('\n'),
    });
  }

  async sendBookingStatus(
    studio: Studio,
    to: string,
    name: string,
    status: string,
    b: { reference: string; packageName: string; startsAt: Date },
    portalUrl: string,
  ) {
    const headline: Record<string, string> = {
      CONFIRMED: 'Your session is confirmed',
      CANCELLED: 'Your booking was cancelled',
      COMPLETED: 'Thanks for your session',
      NO_SHOW: 'We missed you',
      PENDING: 'Deposit received',
    };
    await this.send(studio, {
      to,
      subject: `${headline[status] ?? 'Booking update'} — ${b.packageName}`,
      preheader: headline[status] ?? 'Booking update',
      heading: headline[status] ?? 'Booking update',
      paragraphs: [`Hi ${name}, here is the latest on your booking.`],
      rows: [
        { label: 'Reference', value: b.reference },
        { label: 'Service', value: b.packageName },
        {
          label: 'Date & time',
          value: this.formatDateTime(studio, b.startsAt),
        },
        { label: 'Status', value: status.replace('_', ' ').toLowerCase() },
      ],
      button: { label: 'View my booking', url: portalUrl },
    });
  }

  // ─── Projects, files, billing ──────────────────────────────────────────────
  async sendDeliverableReady(
    studio: Studio,
    to: string,
    name: string,
    projectTitle: string,
    title: string,
    version: number,
    url: string,
  ) {
    await this.send(studio, {
      to,
      subject: `New file to review: ${title} (v${version})`,
      preheader: `${title} is ready for your review`,
      heading: `Hi ${name}, a new file is ready`,
      paragraphs: [
        `Version ${version} of "${title}" for ${projectTitle} is ready. Listen, leave notes, or approve it in your portal.`,
      ],
      button: { label: 'Review file', url },
    });
  }

  async sendDocument(
    studio: Studio,
    to: string,
    name: string,
    kind: 'Quote' | 'Invoice',
    number: string,
    title: string,
    total: number,
    currency: string,
    url: string,
  ) {
    await this.send(studio, {
      to,
      subject: `${kind} ${number} from ${studio.name}`,
      preheader: `${kind} ${number}: ${this.money(total, currency)}`,
      heading: `Hi ${name},`,
      paragraphs: [
        `Here is ${kind === 'Quote' ? 'a quote' : 'an invoice'} for "${title}".`,
      ],
      rows: [
        { label: kind, value: number },
        { label: 'Total', value: this.money(total, currency) },
      ],
      button: { label: kind === 'Quote' ? 'View quote' : 'View and pay', url },
    });
  }

  async sendPaymentReceipt(
    studio: Studio,
    to: string,
    name: string,
    amount: number,
    currency: string,
    forWhat: string,
    url: string,
  ) {
    await this.send(studio, {
      to,
      subject: `Payment received — ${this.money(amount, currency)}`,
      preheader: 'Thank you for your payment',
      heading: `Thank you, ${name}`,
      paragraphs: [
        `We received your payment of ${this.money(amount, currency)} for ${forWhat}.`,
      ],
      button: { label: 'Open my portal', url },
    });
  }

  async sendDirectMessage(
    studio: Studio,
    to: string,
    name: string,
    subject: string,
    message: string,
  ) {
    await this.send(
      studio,
      {
        to,
        subject,
        preheader: subject,
        heading: `Hi ${name},`,
        paragraphs: [message],
        footnote: 'Reply to this email to answer.',
      },
      { rethrow: true },
    );
  }
}
