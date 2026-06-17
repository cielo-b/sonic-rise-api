import { User } from './user.entity';
export declare class LoginLog {
    id: string;
    userId: string;
    user: User;
    status: 'success' | 'failed';
    ipAddress: string | null;
    userAgent: string | null;
    device: string | null;
    createdAt: Date;
}
