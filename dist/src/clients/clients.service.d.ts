import { Repository } from 'typeorm';
import { User } from '../database/entities';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { MailService } from '../mail/mail.service';
export declare class ClientsService {
    private readonly userRepo;
    private readonly mailService;
    constructor(userRepo: Repository<User>, mailService: MailService);
    create(dto: CreateClientDto): Promise<User>;
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User & {
        bookings: unknown;
    }>;
    update(id: string, dto: UpdateClientDto): Promise<User>;
    delete(id: string): Promise<void>;
    sendMessage(id: string, subject: string, message: string): Promise<void>;
}
