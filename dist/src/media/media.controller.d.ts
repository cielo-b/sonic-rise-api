import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { StorageService } from '../storage/storage.service';
export declare class MediaController {
    private readonly mediaService;
    private readonly storageService;
    constructor(mediaService: MediaService, storageService: StorageService);
    upload(file: Express.Multer.File): Promise<{
        url: string;
        type: string;
        size: string;
        name: string;
    }>;
    findAll(user: any): Promise<import("../database/entities").Media[]>;
    findOne(id: string, user: any): Promise<import("../database/entities").Media>;
    create(dto: CreateMediaDto): Promise<import("../database/entities").Media>;
    update(id: string, dto: UpdateMediaDto): Promise<import("../database/entities").Media>;
    remove(id: string): Promise<void>;
}
