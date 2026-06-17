import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, LoginLog, UserSession } from '../database/entities';
import { Role } from '../database/enums';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private readonly userRepo;
    private readonly loginLogRepo;
    private readonly sessionRepo;
    private readonly jwt;
    private readonly config;
    private readonly mail;
    constructor(userRepo: Repository<User>, loginLogRepo: Repository<LoginLog>, sessionRepo: Repository<UserSession>, jwt: JwtService, config: ConfigService, mail: MailService);
    private parseDevice;
    logLoginAttempt(userId: string, status: 'success' | 'failed', ip?: string, userAgent?: string): Promise<void>;
    getLoginHistory(userId: string): Promise<LoginLog[]>;
    createSession(userId: string, jti: string, ip?: string, userAgent?: string): Promise<void>;
    getActiveSessions(userId: string): Promise<UserSession[]>;
    revokeSession(userId: string, sessionId: string): Promise<void>;
    revokeAllSessions(userId: string): Promise<void>;
    isSessionValid(jti: string): Promise<boolean>;
    generate2FASecret(userId: string): Promise<{
        secret: string;
        qrDataUrl: string;
    }>;
    enable2FA(userId: string, code: string): Promise<void>;
    disable2FA(userId: string, code: string): Promise<void>;
    verify2FACode(userId: string, code: string): Promise<boolean>;
    register(dto: RegisterDto): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    }>;
    validateUser(email: string, password: string): Promise<User | null>;
    login(userId: string, ip?: string, userAgent?: string): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    } | {
        requires2FA: boolean;
        tempToken: string;
    }>;
    loginWith2FA(tempToken: string, code: string, ip?: string, userAgent?: string): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    }>;
    sendInvite(email: string, role?: Role): Promise<void>;
    acceptInvite(token: string, name: string, password: string): Promise<void>;
    forgotPassword(email: string): Promise<void>;
    verifyOtp(email: string, otp: string): Promise<{
        resetToken: string;
    }>;
    resetPassword(resetToken: string, password: string): Promise<void>;
    private signToken;
}
