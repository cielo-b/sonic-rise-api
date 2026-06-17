import { MailService } from '../mail/mail.service';
declare class ContactDto {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
}
export declare class ContactController {
    private readonly mail;
    constructor(mail: MailService);
    send(dto: ContactDto): Promise<{
        ok: boolean;
    }>;
}
export {};
