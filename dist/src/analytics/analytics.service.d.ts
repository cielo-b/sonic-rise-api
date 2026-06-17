import { Repository } from 'typeorm';
import { Booking } from '../database/entities';
export declare class AnalyticsService {
    private readonly bookingRepo;
    constructor(bookingRepo: Repository<Booking>);
    monthly(user?: {
        id: string;
        role: string;
    }, year?: number): Promise<{
        month: string;
        bookings: number;
        revenue: number;
    }[]>;
    services(user?: {
        id: string;
        role: string;
    }): Promise<{
        label: string;
        pct: number;
    }[]>;
    summary(user?: {
        id: string;
        role: string;
    }): Promise<{
        totalBookings: number;
        activeBookings: number;
        totalRevenue: number;
    }>;
}
