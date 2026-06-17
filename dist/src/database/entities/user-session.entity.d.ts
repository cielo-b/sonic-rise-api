import { User } from './user.entity';
export declare class UserSession {
    id: string;
    userId: string;
    user: User;
    jti: string;
    device: string | null;
    ipAddress: string | null;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
}
