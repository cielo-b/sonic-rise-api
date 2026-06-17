"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const entities_1 = require("../database/entities");
const enums_1 = require("../database/enums");
const crypto_1 = require("crypto");
const mail_service_1 = require("../mail/mail.service");
let ClientsService = class ClientsService {
    userRepo;
    mailService;
    constructor(userRepo, mailService) {
        this.userRepo = userRepo;
        this.mailService = mailService;
    }
    async create(dto) {
        const exists = await this.userRepo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already registered');
        const passwordToHash = dto.password || (0, crypto_1.randomUUID)();
        const passwordHash = await bcrypt.hash(passwordToHash, 12);
        const client = this.userRepo.create({
            name: dto.name,
            email: dto.email,
            phone: dto.phone ?? null,
            company: dto.company ?? null,
            category: dto.category ?? null,
            notes: dto.notes ?? null,
            passwordHash,
            role: enums_1.Role.CLIENT,
        });
        return this.userRepo.save(client);
    }
    findAll() {
        return this.userRepo.find({
            where: { role: enums_1.Role.CLIENT, isActive: true },
            relations: { bookings: true },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const client = await this.userRepo.findOne({
            where: { id, role: enums_1.Role.CLIENT },
            relations: { bookings: true },
        });
        if (!client)
            throw new common_1.NotFoundException(`Client ${id} not found`);
        return client;
    }
    async update(id, dto) {
        const client = await this.userRepo.findOne({ where: { id, role: enums_1.Role.CLIENT } });
        if (!client)
            throw new common_1.NotFoundException(`Client ${id} not found`);
        Object.assign(client, dto);
        return this.userRepo.save(client);
    }
    async delete(id) {
        const client = await this.userRepo.findOne({ where: { id, role: enums_1.Role.CLIENT } });
        if (!client)
            throw new common_1.NotFoundException(`Client ${id} not found`);
        client.isActive = false;
        await this.userRepo.save(client);
    }
    async sendMessage(id, subject, message) {
        const client = await this.userRepo.findOne({ where: { id, role: enums_1.Role.CLIENT } });
        if (!client)
            throw new common_1.NotFoundException(`Client ${id} not found`);
        if (!client.email)
            throw new common_1.ConflictException(`Client ${id} has no email address`);
        await this.mailService.sendDirectMessage(client.email, client.name, subject, message);
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        mail_service_1.MailService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map