"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
let PortfolioService = class PortfolioService {
    portfolioRepo;
    constructor(portfolioRepo) {
        this.portfolioRepo = portfolioRepo;
    }
    findAll() {
        return this.portfolioRepo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
    }
    findFeatured() {
        return this.portfolioRepo.find({
            where: { isFeatured: true },
            order: { sortOrder: 'ASC' },
        });
    }
    async findOne(id) {
        const item = await this.portfolioRepo.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException(`Portfolio item ${id} not found`);
        return item;
    }
    async create(dto) {
        const item = this.portfolioRepo.create(dto);
        return this.portfolioRepo.save(item);
    }
    async update(id, dto) {
        const item = await this.findOne(id);
        Object.assign(item, dto);
        return this.portfolioRepo.save(item);
    }
    async remove(id) {
        const item = await this.findOne(id);
        await this.portfolioRepo.remove(item);
    }
};
exports.PortfolioService = PortfolioService;
exports.PortfolioService = PortfolioService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Portfolio)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PortfolioService);
//# sourceMappingURL=portfolio.service.js.map