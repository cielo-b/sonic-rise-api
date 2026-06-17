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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
const enums_1 = require("../database/enums");
let PaymentsService = class PaymentsService {
    paymentRepo;
    bookingRepo;
    constructor(paymentRepo, bookingRepo) {
        this.paymentRepo = paymentRepo;
        this.bookingRepo = bookingRepo;
    }
    async initiate(clientId, dto) {
        const booking = await this.bookingRepo.findOne({
            where: { id: dto.bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.clientId !== clientId)
            throw new common_1.NotFoundException('Booking not found');
        const existing = await this.paymentRepo.findOne({
            where: { bookingId: dto.bookingId, status: enums_1.PaymentStatus.SUCCESS },
        });
        if (existing)
            throw new common_1.BadRequestException('Booking is already paid');
        const payment = this.paymentRepo.create({
            bookingId: dto.bookingId,
            amount: dto.amount,
            paymentMethod: dto.paymentMethod,
            status: enums_1.PaymentStatus.PENDING,
        });
        return this.paymentRepo.save(payment);
    }
    async handleWebhook(transactionReference, success, gatewayData) {
        const payment = await this.paymentRepo.findOne({
            where: { transactionReference },
        });
        if (!payment)
            return;
        payment.status = success ? enums_1.PaymentStatus.SUCCESS : enums_1.PaymentStatus.FAILED;
        payment.gatewayResponse = gatewayData;
        payment.paidAt = success ? new Date() : null;
        await this.paymentRepo.save(payment);
    }
    findByBooking(bookingId) {
        return this.paymentRepo.find({
            where: { bookingId },
            order: { createdAt: 'DESC' },
        });
    }
    findAll(clientId, role) {
        return this.paymentRepo.find({
            where: role === enums_1.Role.CLIENT
                ? { booking: { clientId } }
                : {},
            relations: { booking: true },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map