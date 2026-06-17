import { Repository } from 'typeorm';
import { Portfolio } from '../database/entities';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
export declare class PortfolioService {
    private readonly portfolioRepo;
    constructor(portfolioRepo: Repository<Portfolio>);
    findAll(): Promise<Portfolio[]>;
    findFeatured(): Promise<Portfolio[]>;
    findOne(id: string): Promise<Portfolio>;
    create(dto: CreatePortfolioDto): Promise<Portfolio>;
    update(id: string, dto: UpdatePortfolioDto): Promise<Portfolio>;
    remove(id: string): Promise<void>;
}
