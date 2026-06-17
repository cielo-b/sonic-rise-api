import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../database/entities';
import { BookingStatus } from '../database/enums';

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async monthly(user?: { id: string; role: string }, year?: number) {
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

    const rows: { month: string; bookings: string; revenue: string }[] = await qb
      .groupBy('EXTRACT(MONTH FROM b.dateTime)::int')
      .orderBy('EXTRACT(MONTH FROM b.dateTime)::int', 'ASC')
      .getRawMany();

    // Fill all 12 months — zero if no bookings that month
    return Array.from({ length: 12 }, (_, i) => {
      const row = rows.find((r) => Number(r.month) === i + 1);
      return {
        month:    MONTH_ABBR[i],
        bookings: row ? Number(row.bookings) : 0,
        revenue:  row ? parseFloat(row.revenue) : 0,
      };
    });
  }

  async services(user?: { id: string; role: string }) {
    const SERVICE_LABELS: Record<string, string> = {
      AUDIO:      'Audio Sessions',
      VIDEO:      'Video Production',
      PODCAST:    'Podcast Sessions',
      LIVESTREAM: 'Live Streams',
    };

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .select('b.serviceType', 'serviceType')
      .addSelect('COUNT(*)', 'count');

    if (user?.role === 'CLIENT') {
      qb.where('b.clientId = :clientId', { clientId: user.id });
    }

    const rows: { serviceType: string; count: string }[] = await qb
      .groupBy('b.serviceType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = rows.reduce((s, r) => s + Number(r.count), 0) || 1;
    return rows.map((r) => ({
      label: SERVICE_LABELS[r.serviceType] ?? r.serviceType,
      pct:   Math.round((Number(r.count) / total) * 100),
    }));
  }

  async summary(user?: { id: string; role: string }) {
    const baseWhere = user?.role === 'CLIENT' ? { clientId: user.id } : {};

    const [total, active, revenue] = await Promise.all([
      this.bookingRepo.count({ where: baseWhere }),
      this.bookingRepo.count({
        where: [
          { status: BookingStatus.CONFIRMED, ...baseWhere },
          { status: BookingStatus.PENDING, ...baseWhere },
        ],
      }),
      this.bookingRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.totalAmount), 0)', 'total')
        .where('b.status = :s', { s: BookingStatus.COMPLETED })
        .andWhere(user?.role === 'CLIENT' ? 'b.clientId = :clientId' : '1=1', { clientId: user?.id })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      totalBookings:  total,
      activeBookings: active,
      totalRevenue:   parseFloat(revenue?.total ?? '0'),
    };
  }
}
