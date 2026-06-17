import { Repository } from 'typeorm';
import { Media } from '../database/entities';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
export declare class MediaService {
    private readonly mediaRepo;
    constructor(mediaRepo: Repository<Media>);
    findAll(user?: {
        id: string;
        role: string;
    }): Promise<Media[]>;
    findOne(id: string, user?: {
        id: string;
        role: string;
    }): Promise<Media>;
    create(dto: CreateMediaDto): Promise<Media>;
    update(id: string, dto: UpdateMediaDto): Promise<Media>;
    remove(id: string): Promise<void>;
}
