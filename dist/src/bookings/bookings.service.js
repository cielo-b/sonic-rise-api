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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
const enums_1 = require("../database/enums");
const mail_service_1 = require("../mail/mail.service");
let BookingsService = class BookingsService {
    bookingRepo;
    userRepo;
    mail;
    constructor(bookingRepo, userRepo, mail) {
        this.bookingRepo = bookingRepo;
        this.userRepo = userRepo;
        this.mail = mail;
    }
    async create(clientId, dto, role) {
        let finalClientId = clientId || null;
        let finalGuestName = null;
        let finalGuestEmail = null;
        const isAdminOrStaff = role === enums_1.Role.SUPERADMIN;
        if (isAdminOrStaff && dto.clientId) {
            finalClientId = dto.clientId;
        }
        else if (isAdminOrStaff && !dto.clientId && dto.guestEmail && dto.guestName) {
            finalClientId = null;
            finalGuestName = dto.guestName;
            finalGuestEmail = dto.guestEmail;
        }
        const booking = this.bookingRepo.create({
            clientId: finalClientId,
            guestName: finalGuestName,
            guestEmail: finalGuestEmail,
            serviceType: dto.serviceType,
            dateTime: new Date(dto.dateTime),
            endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
            totalAmount: dto.totalAmount,
            notes: dto.notes ?? null,
        });
        const saved = await this.bookingRepo.save(booking);
        if (finalClientId) {
            this.userRepo.findOne({ where: { id: finalClientId } }).then((client) => {
                if (!client)
                    return;
                this.mail.sendBookingConfirmation(client.email, client.name, {
                    id: saved.id,
                    serviceType: saved.serviceType,
                    dateTime: saved.dateTime,
                    totalAmount: saved.totalAmount,
                    currency: saved.currency,
                    notes: saved.notes,
                }).catch(() => { });
            }).catch(() => { });
        }
        else if (finalGuestEmail && finalGuestName) {
            this.mail.sendBookingConfirmation(finalGuestEmail, finalGuestName, {
                id: saved.id,
                serviceType: saved.serviceType,
                dateTime: saved.dateTime,
                totalAmount: saved.totalAmount,
                currency: saved.currency,
                notes: saved.notes,
            }).catch(() => { });
        }
        return saved;
    }
    findAll(clientId, role) {
        const where = role === enums_1.Role.CLIENT ? { clientId } : {};
        return this.bookingRepo.find({
            where,
            relations: { client: true, payments: true },
            order: { dateTime: 'DESC' },
        });
    }
    async findOne(id, clientId, role) {
        const booking = await this.bookingRepo.findOne({
            where: { id },
            relations: { client: true, payments: true },
        });
        if (!booking)
            throw new common_1.NotFoundException(`Booking ${id} not found`);
        if (role === enums_1.Role.CLIENT && booking.clientId !== clientId) {
            throw new common_1.NotFoundException(`Booking ${id} not found`);
        }
        return booking;
    }
    async update(id, dto, clientId, role) {
        const booking = await this.findOne(id, clientId, role);
        const prevStatus = booking.status;
        if (role === enums_1.Role.CLIENT) {
            if (dto.status && dto.status !== enums_1.BookingStatus.CANCELLED) {
                throw new common_1.BadRequestException('Clients may only cancel their bookings');
            }
            delete dto.internalNotes;
        }
        Object.assign(booking, {
            ...dto,
            guestName: dto.guestName !== undefined ? dto.guestName : booking.guestName,
            guestEmail: dto.guestEmail !== undefined ? dto.guestEmail : booking.guestEmail,
            dateTime: dto.dateTime ? new Date(dto.dateTime) : booking.dateTime,
            endsAt: dto.endsAt ? new Date(dto.endsAt) : booking.endsAt,
        });
        const saved = await this.bookingRepo.save(booking);
        const notifyStatuses = [enums_1.BookingStatus.CONFIRMED, enums_1.BookingStatus.CANCELLED];
        if (dto.status && dto.status !== prevStatus && notifyStatuses.includes(saved.status)) {
            if (saved.clientId) {
                this.userRepo.findOne({ where: { id: saved.clientId } }).then((client) => {
                    if (!client)
                        return;
                    this.mail.sendBookingStatusUpdate(client.email, client.name, saved.status, saved.id)
                        .catch(() => { });
                }).catch(() => { });
            }
            else if (saved.guestEmail && saved.guestName) {
                this.mail.sendBookingStatusUpdate(saved.guestEmail, saved.guestName, saved.status, saved.id)
                    .catch(() => { });
            }
        }
        return saved;
    }
    async remove(id, clientId, role) {
        const booking = await this.findOne(id, clientId, role);
        if (role === enums_1.Role.CLIENT) {
            throw new common_1.BadRequestException('Clients cannot delete bookings permanently');
        }
        await this.bookingRepo.remove(booking);
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mail_service_1.MailService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map