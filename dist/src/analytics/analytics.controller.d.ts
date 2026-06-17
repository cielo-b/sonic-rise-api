import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly svc;
    constructor(svc: AnalyticsService);
    monthly(year?: number, user?: any): Promise<{
        month: string;
        bookings: number;
        revenue: number;
    }[]>;
    services(user?: any): Promise<{
        label: string;
        pct: number;
    }[]>;
    summary(user?: any): Promise<{
        totalBookings: number;
        activeBookings: number;
        totalRevenue: number;
    }>;
}
