import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { StorageService } from '../storage/storage.service';
export declare class PortfolioController {
    private readonly portfolioService;
    private readonly storageService;
    constructor(portfolioService: PortfolioService, storageService: StorageService);
    upload(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    findAll(): Promise<import("../database/entities").Portfolio[]>;
    findFeatured(): Promise<import("../database/entities").Portfolio[]>;
    findOne(id: string): Promise<import("../database/entities").Portfolio>;
    create(dto: CreatePortfolioDto): Promise<import("../database/entities").Portfolio>;
    update(id: string, dto: UpdatePortfolioDto): Promise<import("../database/entities").Portfolio>;
    remove(id: string): Promise<void>;
}
