import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly log;
    private readonly transporter;
    private readonly from;
    constructor(config: ConfigService);
    private getEmailTemplate;
    sendInvite(to: string, inviteToken: string): Promise<void>;
    sendContactMessage(data: {
        from: string;
        name: string;
        phone: string;
        subject: string;
        message: string;
    }): Promise<void>;
    sendBookingConfirmation(to: string, name: string, booking: {
        id: string;
        serviceType: string;
        dateTime: Date;
        totalAmount: number;
        currency: string;
        notes: string | null;
    }): Promise<void>;
    sendBookingStatusUpdate(to: string, name: string, status: string, bookingId: string): Promise<void>;
    sendOtp(to: string, name: string, otp: string): Promise<void>;
    sendDirectMessage(to: string, name: string, subject: string, message: string): Promise<void>;
}
