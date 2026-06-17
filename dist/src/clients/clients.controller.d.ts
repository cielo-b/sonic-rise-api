import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
export declare class ClientsController {
    private clientsService;
    constructor(clientsService: ClientsService);
    create(dto: CreateClientDto): Promise<import("../database/entities").User>;
    findAll(): Promise<import("../database/entities").User[]>;
    findOne(id: string): Promise<import("../database/entities").User & {
        bookings: unknown;
    }>;
    update(id: string, dto: UpdateClientDto): Promise<import("../database/entities").User>;
    remove(id: string): Promise<void>;
    sendMessage(id: string, body: {
        subject: string;
        message: string;
    }): Promise<void>;
}
