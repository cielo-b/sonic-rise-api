import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Studio } from '../database/entities';
import {
  BookingStatus,
  DeliverableStatus,
  InvoiceStatus,
  PaymentStatus,
} from '../database/enums';
import { localParts, toMinutes, zonedToUtc } from '../common/time';

const num = (v: unknown) => Number(v ?? 0);

/** Raw rows: Postgres returns numbers from SUM/COUNT as strings. */
type Row = Record<string, string | null>;

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private async studio(studioId: string) {
    const s = await this.db.manager.findOne(Studio, {
      where: { id: studioId },
    });
    if (!s) throw new NotFoundException('Studio not found');
    return s;
  }

  /** Hours the studio is open between two instants, from its weekly opening hours. */
  private openHours(studio: Studio, from: Date, to: Date): number | null {
    const hours = studio.openingHours ?? {};
    if (!Object.keys(hours).length) return null;
    let total = 0;
    const startDate = localParts(from, studio.timezone).date;
    for (
      let day = zonedToUtc(startDate, '00:00', studio.timezone);
      day < to;
      day = new Date(day.getTime() + 86_400_000)
    ) {
      const local = localParts(
        new Date(day.getTime() + 12 * 3_600_000),
        studio.timezone,
      );
      const w = hours[String(local.weekday) as keyof typeof hours];
      if (!w) continue;
      const open = zonedToUtc(local.date, w.open, studio.timezone);
      const closeMin = w.close === '00:00' ? 24 * 60 : toMinutes(w.close);
      const close = new Date(
        zonedToUtc(local.date, '00:00', studio.timezone).getTime() +
          closeMin * 60_000,
      );
      const s = Math.max(open.getTime(), from.getTime());
      const e = Math.min(close.getTime(), to.getTime());
      if (e > s) total += (e - s) / 3_600_000;
    }
    return total;
  }

  async overview(studioId: string, fromIso?: string, toIso?: string) {
    const studio = await this.studio(studioId);
    const to = toIso ? new Date(toIso) : new Date();
    const from = fromIso
      ? new Date(fromIso)
      : new Date(to.getTime() - 30 * 86_400_000);
    const p = { sid: studioId, from, to, success: PaymentStatus.SUCCESS };
    const q = (sql: string, params: unknown[]): Promise<Row[]> =>
      this.db.query(sql, params);

    const [revenue] = await q(
      `SELECT COALESCE(SUM(amount),0) total, COUNT(*) count FROM payments
       WHERE "studioId"=$1 AND status=$4 AND "paidAt" >= $2 AND "paidAt" < $3`,
      [p.sid, p.from, p.to, p.success],
    );
    const byPurpose = await q(
      `SELECT purpose, COALESCE(SUM(amount),0) total FROM payments
       WHERE "studioId"=$1 AND status=$4 AND "paidAt" >= $2 AND "paidAt" < $3 GROUP BY purpose`,
      [p.sid, p.from, p.to, p.success],
    );
    const byMethod = await q(
      `SELECT method, COALESCE(SUM(amount),0) total FROM payments
       WHERE "studioId"=$1 AND status=$4 AND "paidAt" >= $2 AND "paidAt" < $3 GROUP BY method`,
      [p.sid, p.from, p.to, p.success],
    );
    const paidBy = (col: string, join: string, label: string) =>
      q(
        `SELECT ${col} id, ${label} name, COALESCE(SUM(pay.amount),0) revenue, COUNT(DISTINCT b.id) sessions
         FROM payments pay JOIN bookings b ON b.id = pay."bookingId" ${join}
         WHERE pay."studioId"=$1 AND pay.status=$4 AND pay."paidAt" >= $2 AND pay."paidAt" < $3
         GROUP BY 1, 2 ORDER BY revenue DESC`,
        [p.sid, p.from, p.to, p.success],
      );
    const [byRoom, byEngineer, byPackage] = await Promise.all([
      paidBy('r.id', 'JOIN rooms r ON r.id = b."roomId"', 'r.name'),
      paidBy('u.id', 'JOIN users u ON u.id = b."engineerId"', 'u.name'),
      paidBy(
        'sp.id',
        'JOIN service_packages sp ON sp.id = b."packageId"',
        'sp.name',
      ),
    ]);

    const statusRows = await q(
      `SELECT status, COUNT(*) count FROM bookings
       WHERE "studioId"=$1 AND "startsAt" >= $2 AND "startsAt" < $3 GROUP BY status`,
      [p.sid, p.from, p.to],
    );
    const statuses = Object.fromEntries(
      statusRows.map((r: { status: string; count: string }) => [
        r.status,
        num(r.count),
      ]),
    );
    const completed = statuses[BookingStatus.COMPLETED] ?? 0;
    const noShow = statuses[BookingStatus.NO_SHOW] ?? 0;
    const cancelled = statuses[BookingStatus.CANCELLED] ?? 0;
    const totalBookings = Object.values(statuses).reduce(
      (a: number, b) => a + b,
      0,
    );

    // Booked hours per room, clipped to the period, for sessions that happened or will.
    const roomHours = await q(
      `SELECT r.id, r.name,
         COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(b."endsAt", $3) - GREATEST(b."startsAt", $2))) / 3600), 0) hours
       FROM rooms r
       LEFT JOIN bookings b ON b."roomId" = r.id AND b."startsAt" < $3 AND b."endsAt" > $2
         AND b.status IN ('PENDING','CONFIRMED','COMPLETED')
       WHERE r."studioId"=$1 AND r."isActive" = true
       GROUP BY r.id, r.name ORDER BY r.name`,
      [p.sid, p.from, p.to],
    );
    const open = this.openHours(studio, from, to);
    const utilization = roomHours.map(
      (r: { id: string; name: string; hours: string }) => ({
        id: r.id,
        name: r.name,
        bookedHours: Math.round(num(r.hours) * 10) / 10,
        openHours: open === null ? null : Math.round(open * 10) / 10,
        rate: open ? Math.min(1, num(r.hours) / open) : null,
      }),
    );

    const topClients = await q(
      `SELECT u.id, u.name, COALESCE(SUM(pay.amount),0) paid
       FROM payments pay JOIN users u ON u.id = pay."payerId"
       WHERE pay."studioId"=$1 AND pay.status=$4 AND pay."paidAt" >= $2 AND pay."paidAt" < $3
       GROUP BY u.id, u.name ORDER BY paid DESC LIMIT 10`,
      [p.sid, p.from, p.to, p.success],
    );

    const yearAgo = new Date(to.getTime() - 365 * 86_400_000);
    const monthly = await q(
      `SELECT to_char(date_trunc('month', "paidAt" AT TIME ZONE $3), 'YYYY-MM') month, COALESCE(SUM(amount),0) revenue
       FROM payments WHERE "studioId"=$1 AND status=$4 AND "paidAt" >= $2
       GROUP BY 1 ORDER BY 1`,
      [p.sid, yearAgo, studio.timezone, p.success],
    );
    const monthlyBookings = await q(
      `SELECT to_char(date_trunc('month', "startsAt" AT TIME ZONE $3), 'YYYY-MM') month, COUNT(*) bookings
       FROM bookings WHERE "studioId"=$1 AND "startsAt" >= $2 AND status <> 'CANCELLED'
       GROUP BY 1 ORDER BY 1`,
      [p.sid, yearAgo, studio.timezone],
    );

    const toMoney = (rows: Record<string, unknown>[], key = 'revenue') =>
      rows.map((r) => ({
        ...r,
        [key]: num(r[key]),
        ...(r.sessions !== undefined && { sessions: num(r.sessions) }),
      }));

    return {
      period: { from, to },
      currency: studio.currency,
      revenue: { total: num(revenue.total), payments: num(revenue.count) },
      revenueByPurpose: byPurpose.map(
        (r: { purpose: string; total: string }) => ({
          purpose: r.purpose,
          total: num(r.total),
        }),
      ),
      revenueByMethod: byMethod.map((r: { method: string; total: string }) => ({
        method: r.method,
        total: num(r.total),
      })),
      revenueByRoom: toMoney(byRoom),
      revenueByEngineer: toMoney(byEngineer),
      revenueByPackage: toMoney(byPackage),
      bookings: {
        total: totalBookings,
        byStatus: statuses,
        noShowRate: completed + noShow ? noShow / (completed + noShow) : null,
        cancellationRate: totalBookings ? cancelled / totalBookings : null,
      },
      utilization,
      topClients: toMoney(topClients, 'paid'),
      monthly: monthly
        .map((r: { month: string; revenue: string }) => ({
          month: r.month,
          revenue: num(r.revenue),
          bookings: num(
            monthlyBookings.find((b: { month: string }) => b.month === r.month)
              ?.bookings,
          ),
        }))
        .concat(
          monthlyBookings
            .filter(
              (b: { month: string }) =>
                !monthly.some((r: { month: string }) => r.month === b.month),
            )
            .map((b: { month: string; bookings: string }) => ({
              month: b.month,
              revenue: 0,
              bookings: num(b.bookings),
            })),
        )
        .sort((a: { month: string }, b: { month: string }) =>
          a.month.localeCompare(b.month),
        ),
    };
  }

  /** The day at a glance for any team member. */
  async today(studioId: string) {
    const studio = await this.studio(studioId);
    const today = localParts(new Date(), studio.timezone).date;
    const start = zonedToUtc(today, '00:00', studio.timezone);
    const end = new Date(start.getTime() + 86_400_000);
    const q = (sql: string, params: unknown[]): Promise<Row[]> =>
      this.db.query(sql, params);

    const sessions = await q(
      `SELECT b.id, b."startsAt", b."endsAt", b.status, b."guestName",
              c.name client, r.name room, r.color "roomColor", e.name engineer, sp.name package
       FROM bookings b
       JOIN rooms r ON r.id = b."roomId"
       JOIN service_packages sp ON sp.id = b."packageId"
       LEFT JOIN users c ON c.id = b."clientId"
       LEFT JOIN users e ON e.id = b."engineerId"
       WHERE b."studioId"=$1 AND b."startsAt" < $3 AND b."endsAt" > $2
         AND b.status IN ('PENDING','CONFIRMED','COMPLETED','PENDING_DEPOSIT')
       ORDER BY b."startsAt"`,
      [studioId, start, end],
    );
    const [pending] = await q(
      `SELECT COUNT(*) count FROM bookings WHERE "studioId"=$1 AND status IN ('PENDING','PENDING_DEPOSIT') AND "startsAt" > now()`,
      [studioId],
    );
    const [unpaid] = await q(
      `SELECT COUNT(*) count, COALESCE(SUM(total - "amountPaid"),0) due FROM invoices
       WHERE "studioId"=$1 AND status IN ($2,$3)`,
      [studioId, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID],
    );
    const [review] = await q(
      `SELECT COUNT(*) count FROM deliverables WHERE "studioId"=$1 AND status=$2 AND "latestVersion" > 0`,
      [studioId, DeliverableStatus.IN_REVIEW],
    );
    const [inquiries] = await q(
      `SELECT COUNT(*) count FROM inquiries WHERE "studioId"=$1 AND "isHandled" = false`,
      [studioId],
    );

    return {
      date: today,
      timezone: studio.timezone,
      currency: studio.currency,
      sessions,
      pendingRequests: num(pending.count),
      unpaidInvoices: { count: num(unpaid.count), due: num(unpaid.due) },
      filesAwaitingClient: num(review.count),
      openInquiries: num(inquiries.count),
    };
  }
}
