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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
const enums_1 = require("../database/enums");
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
let AnalyticsService = class AnalyticsService {
    bookingRepo;
    constructor(bookingRepo) {
        this.bookingRepo = bookingRepo;
    }
    async monthly(user, year) {
        const y = year ?? new Date().getFullYear();
        const qb = this.bookingRepo
            .createQueryBuilder('b')
            .select('EXTRACT(MONTH FROM b.dateTime)::int', 'month')
            .addSelect('COUNT(*)', 'bookings')
            .addSelect('COALESCE(SUM(b.totalAmount), 0)', 'revenue')
            .where('EXTRACT(YEAR FROM b.dateTime) = :y', { y });
        if (user?.role === 'CLIENT') {
            qb.andWhere('b.clientId = :clientId', { clientId: user.id });
        }
        const rows = await qb
            .groupBy('EXTRACT(MONTH FROM b.dateTime)::int')
            .orderBy('EXTRACT(MONTH FROM b.dateTime)::int', 'ASC')
            .getRawMany();
        return Array.from({ length: 12 }, (_, i) => {
            const row = rows.find((r) => Number(r.month) === i + 1);
            return {
                month: MONTH_ABBR[i],
                bookings: row ? Number(row.bookings) : 0,
                revenue: row ? parseFloat(row.revenue) : 0,
            };
        });
    }
    async services(user) {
        const SERVICE_LABELS = {
            AUDIO: 'Audio Sessions',
            VIDEO: 'Video Production',
            PODCAST: 'Podcast Sessions',
            LIVESTREAM: 'Live Streams',
        };
        const qb = this.bookingRepo
            .createQueryBuilder('b')
            .select('b.serviceType', 'serviceType')
            .addSelect('COUNT(*)', 'count');
        if (user?.role === 'CLIENT') {
            qb.where('b.clientId = :clientId', { clientId: user.id });
        }
        const rows = await qb
            .groupBy('b.serviceType')
            .orderBy('count', 'DESC')
            .getRawMany();
        const total = rows.reduce((s, r) => s + Number(r.count), 0) || 1;
        return rows.map((r) => ({
            label: SERVICE_LABELS[r.serviceType] ?? r.serviceType,
            pct: Math.round((Number(r.count) / total) * 100),
        }));
    }
    async summary(user) {
        const baseWhere = user?.role === 'CLIENT' ? { clientId: user.id } : {};
        const [total, active, revenue] = await Promise.all([
            this.bookingRepo.count({ where: baseWhere }),
            this.bookingRepo.count({
                where: [
                    { status: enums_1.BookingStatus.CONFIRMED, ...baseWhere },
                    { status: enums_1.BookingStatus.PENDING, ...baseWhere },
                ],
            }),
            this.bookingRepo
                .createQueryBuilder('b')
                .select('COALESCE(SUM(b.totalAmount), 0)', 'total')
                .where('b.status = :s', { s: enums_1.BookingStatus.COMPLETED })
                .andWhere(user?.role === 'CLIENT' ? 'b.clientId = :clientId' : '1=1', { clientId: user?.id })
                .getRawOne(),
        ]);
        return {
            totalBookings: total,
            activeBookings: active,
            totalRevenue: parseFloat(revenue?.total ?? '0'),
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map