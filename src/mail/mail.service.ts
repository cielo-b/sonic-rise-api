import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/** Escapes user-supplied text before it is interpolated into email HTML. */
function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
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

  private getEmailTemplate(content: string, preheader: string = ''): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SonicRise Studio</title>
      </head>
      <body style="margin:0;padding:40px 20px;background-color:#08080C;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <span style="display:none;font-size:1px;color:#08080C;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
          ${preheader}
        </span>
        <div style="max-width:520px;margin:0 auto;background:#0D0E15;color:#E4E1EC;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);border:1px solid #1F1F27">
          <div style="height:6px;width:100%;background:linear-gradient(90deg, #7C3AED, #3CD7FF)"></div>
          
          <div style="padding:48px 40px 40px">
            <div style="margin-bottom:40px">
              <span style="font-size:26px;font-weight:900;letter-spacing:-0.03em;color:#ffffff;vertical-align:middle">SonicRise</span>
              <span style="font-size:11px;color:#3CD7FF;margin-left:12px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;vertical-align:middle">Studio</span>
            </div>
            ${content}
          </div>
          
          <div style="background:#0A0A0F;padding:32px 40px;border-top:1px solid #1F1F27;text-align:center">
            <p style="margin:0 0 16px;font-size:12px;color:#929095;text-transform:uppercase;letter-spacing:0.05em">SonicRise Production Suite</p>
            <div style="margin-bottom:16px">
              <a href="#" style="color:#3CD7FF;text-decoration:none;font-size:12px;font-weight:600;margin:0 8px">Website</a>
              <span style="color:#2D2D38">•</span>
              <a href="#" style="color:#3CD7FF;text-decoration:none;font-size:12px;font-weight:600;margin:0 8px">Portfolio</a>
              <span style="color:#2D2D38">•</span>
              <a href="#" style="color:#3CD7FF;text-decoration:none;font-size:12px;font-weight:600;margin:0 8px">Contact</a>
            </div>
            <p style="margin:0;font-size:11px;color:#47464B">&copy; ${new Date().getFullYear()} SonicRise Studio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendInvite(to: string, inviteToken: string): Promise<string> {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const link = `${frontendUrl}/admin/accept-invite?token=${inviteToken}&email=${encodeURIComponent(to)}`;

    const content = `
      <h2 style="font-size:24px;font-weight:700;margin:0 0 12px;color:#ffffff">You've been invited</h2>
      <p style="color:#929095;font-size:15px;margin:0 0 32px;line-height:1.6">You have been invited to join the SonicRise Cinematic Studio production suite. Click the button below to set up your account.</p>
      <div style="text-align:center;margin-bottom:32px">
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg, #7C3AED, #D2BBFF);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:12px;font-size:15px;font-weight:600;box-shadow:0 8px 16px rgba(124,58,237,0.3)">Accept Invitation</a>
      </div>
      <p style="color:#47464B;font-size:12px;margin:0;text-align:center">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"SonicRise Studio" <${this.from}>`,
        to,
        subject: "You're invited to join SonicRise Production Suite",
        html: this.getEmailTemplate(
          content,
          'You have been invited to join SonicRise Studio',
        ),
      });
      this.log.log(`Invite email sent to ${to}`);
      return link;
    } catch (err) {
      this.log.error(`Failed to send invite to ${to}`, err);
      throw err;
    }
  }

  async sendContactMessage(data: {
    from: string;
    name: string;
    phone: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const content = `
      <h2 style="font-size:20px;font-weight:700;margin:0 0 24px;color:#ffffff">New Contact Message</h2>
      
      <div style="background:#1B1B23;border:1px solid #2D2D38;border-radius:16px;padding:24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#929095;font-size:13px;width:100px;border-bottom:1px solid #2D2D38">Name</td><td style="padding:8px 0;font-size:14px;color:#E4E1EC;border-bottom:1px solid #2D2D38">${esc(data.name)}</td></tr>
          <tr><td style="padding:8px 0;color:#929095;font-size:13px;border-bottom:1px solid #2D2D38">Email</td><td style="padding:8px 0;font-size:14px;color:#3CD7FF;border-bottom:1px solid #2D2D38"><a href="mailto:${esc(data.from)}" style="color:#3CD7FF;text-decoration:none">${esc(data.from)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#929095;font-size:13px;border-bottom:1px solid #2D2D38">Phone</td><td style="padding:8px 0;font-size:14px;color:#E4E1EC;border-bottom:1px solid #2D2D38">${esc(data.phone || '—')}</td></tr>
          <tr><td style="padding:8px 0;color:#929095;font-size:13px">Subject</td><td style="padding:8px 0;font-size:14px;color:#E4E1EC">${esc(data.subject || '—')}</td></tr>
        </table>
      </div>
      
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#929095;margin:0 0 12px">Message Body</h3>
      <div style="background:#13131A;border:1px solid #2D2D38;border-radius:12px;padding:24px;border-left:4px solid #7C3AED">
        <p style="margin:0;font-size:15px;line-height:1.7;white-space:pre-wrap;color:#C8C5CB">${esc(data.message)}</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"SonicRise Contact" <${this.from}>`,
        to: this.from,
        replyTo: data.from,
        subject: `[Contact] ${data.subject || 'New message'} — ${data.name}`,
        html: this.getEmailTemplate(
          content,
          `New message from ${esc(data.name)}`,
        ),
      });
    } catch (err) {
      this.log.error('Failed to send contact message', err);
      throw err;
    }
  }

  async sendBookingConfirmation(
    to: string,
    name: string,
    booking: {
      id: string;
      serviceType: string;
      dateTime: Date;
      totalAmount: number;
      currency: string;
      notes: string | null;
    },
  ): Promise<void> {
    const SERVICE_LABELS: Record<string, string> = {
      AUDIO: 'Audio Session',
      VIDEO: 'Video Production',
      PODCAST: 'Podcast Session',
      LIVESTREAM: 'Live Stream',
    };
    const formattedDate = booking.dateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Kigali',
    });

    const content = `
      <h2 style="font-size:24px;font-weight:700;margin:0 0 8px;color:#ffffff">Booking Request Received</h2>
      <p style="color:#929095;font-size:15px;margin:0 0 32px;line-height:1.6">Hi ${esc(name)}, your session has been received and is pending confirmation from the team.</p>
      
      <div style="background:#1B1B23;border:1px solid #2D2D38;border-radius:16px;padding:28px;margin-bottom:32px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#929095;font-size:13px;width:120px;border-bottom:1px solid #2D2D38">Service</td><td style="padding:10px 0;font-size:15px;color:#E4E1EC;border-bottom:1px solid #2D2D38;font-weight:500">${SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}</td></tr>
          <tr><td style="padding:10px 0;color:#929095;font-size:13px;border-bottom:1px solid #2D2D38">Date & Time</td><td style="padding:10px 0;font-size:15px;color:#E4E1EC;border-bottom:1px solid #2D2D38">${formattedDate}</td></tr>
          <tr><td style="padding:10px 0;color:#929095;font-size:13px;border-bottom:1px solid #2D2D38">Amount</td><td style="padding:10px 0;font-size:16px;color:#3CD7FF;font-weight:700;border-bottom:1px solid #2D2D38">${booking.totalAmount.toLocaleString()} ${booking.currency}</td></tr>
          <tr><td style="padding:10px 0;color:#929095;font-size:13px">Booking ID</td><td style="padding:10px 0;font-size:13px;font-family:monospace;color:#929095">${booking.id}</td></tr>
        </table>
        ${booking.notes ? `<div style="margin-top:20px;padding-top:20px;border-top:1px dashed #2D2D38"><p style="margin:0;color:#C8C5CB;font-size:14px;line-height:1.6"><span style="color:#929095;font-size:12px;text-transform:uppercase;display:block;margin-bottom:4px">Notes</span>${esc(booking.notes)}</p></div>` : ''}
      </div>
      <p style="color:#929095;font-size:13px;margin:0;line-height:1.6">Please arrive 15 minutes before your session. Max 3 guests. Reply to this email with any questions.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"SonicRise Studio" <${this.from}>`,
        to,
        subject: `Booking Request Received — ${SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}`,
        html: this.getEmailTemplate(
          content,
          'Your booking is pending confirmation',
        ),
      });
    } catch (err) {
      this.log.error(`Failed to send booking confirmation to ${to}`, err);
    }
  }

  async sendBookingStatusUpdate(
    to: string,
    name: string,
    status: string,
    bookingId: string,
  ): Promise<void> {
    const isConfirmed = status === 'CONFIRMED';
    const subject = isConfirmed
      ? 'Your booking is confirmed!'
      : 'Booking update from SonicRise';
    const color = isConfirmed ? '#3CD7FF' : '#EF4444';
    const headline = isConfirmed ? 'Session Confirmed' : 'Session Cancelled';
    const body = isConfirmed
      ? 'Great news! Your session has been confirmed by the team. We look forward to seeing you at the studio.'
      : "Unfortunately your session has been cancelled. Please get in touch if you'd like to reschedule.";

    const content = `
      <div style="display:inline-block;background:${color}15;border:1px solid ${color}40;color:${color};font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;padding:6px 14px;border-radius:20px;margin-bottom:20px;font-weight:700">${headline}</div>
      <h2 style="font-size:24px;font-weight:700;margin:0 0 12px;color:#ffffff">Hi ${esc(name)},</h2>
      <p style="color:#C8C5CB;font-size:15px;margin:0 0 32px;line-height:1.6">${body}</p>
      
      <div style="border-top:1px solid #1F1F27;padding-top:24px;margin-top:24px">
        <p style="color:#929095;font-size:13px;font-family:monospace;margin:0 0 8px">Booking ref: ${bookingId}</p>
        <p style="color:#929095;font-size:13px;margin:0">Questions? Reply to this email or call us at +250 788 000 000.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"SonicRise Studio" <${this.from}>`,
        to,
        subject,
        html: this.getEmailTemplate(
          content,
          isConfirmed
            ? 'Your session is confirmed'
            : 'Your session was cancelled',
        ),
      });
    } catch (err) {
      this.log.error(`Failed to send status update to ${to}`, err);
    }
  }

  async sendOtp(to: string, name: string, otp: string): Promise<void> {
    const content = `
      <h2 style="font-size:24px;font-weight:700;margin:0 0 12px;color:#ffffff">Password Reset Code</h2>
      <p style="color:#929095;font-size:15px;margin:0 0 32px;line-height:1.6">Hi ${esc(name)}, use the secure code below to reset your password. It expires in <strong style="color:#E4E1EC">10 minutes</strong>.</p>
      
      <div style="background:linear-gradient(180deg, #1B1B23 0%, #13131A 100%);border:1px solid #2D2D38;border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05)">
        <span style="font-family:'SF Mono', Monaco, monospace;font-size:42px;font-weight:700;letter-spacing:0.3em;color:#3CD7FF;text-shadow:0 0 20px rgba(60,215,255,0.4)">${otp}</span>
      </div>
      
      <p style="color:#47464B;font-size:12px;margin:0;text-align:center">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"SonicRise Studio" <${this.from}>`,
        to,
        subject: 'Your SonicRise password reset code',
        html: this.getEmailTemplate(
          content,
          'Your password reset code is inside',
        ),
      });
      this.log.log(`OTP email sent to ${to}`);
    } catch (err) {
      this.log.error(`Failed to send OTP email to ${to}`, err);
      throw err;
    }
  }

  async sendDirectMessage(
    to: string,
    name: string,
    subject: string,
    message: string,
  ): Promise<void> {
    const content = `
      <h2 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff">Hi ${esc(name)},</h2>
      <div style="background:#1B1B23;border:1px solid #2D2D38;border-radius:16px;padding:32px;margin:32px 0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05)">
        <p style="margin:0;font-size:15px;line-height:1.7;white-space:pre-wrap;color:#C8C5CB">${esc(message)}</p>
      </div>
      <p style="color:#929095;font-size:14px;margin:0;line-height:1.6">If you have any questions or need further assistance, simply reply directly to this email.<br><br>Best regards,<br><strong style="color:#E4E1EC">The SonicRise Team</strong></p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"SonicRise Studio" <${this.from}>`,
        to,
        subject,
        html: this.getEmailTemplate(
          content,
          'You have a new message from SonicRise Studio',
        ),
      });
      this.log.log(`Direct message sent to ${to}`);
    } catch (err) {
      this.log.error(`Failed to send direct message to ${to}`, err);
      throw err;
    }
  }
}
