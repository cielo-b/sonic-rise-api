import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
declare class Verify2FADto {
    code: string;
}
declare class Login2FADto {
    tempToken: string;
    code: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../database/enums").Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    }>;
    login(_dto: LoginDto, req: {
        user: {
            id: string;
        };
        ip: string;
        headers: Record<string, string>;
    }): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../database/enums").Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    } | {
        requires2FA: boolean;
        tempToken: string;
    }>;
    loginWith2FA(dto: Login2FADto, req: {
        ip: string;
        headers: Record<string, string>;
    }): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../database/enums").Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    }>;
    refresh(user: {
        id: string;
        email: string;
        role: string;
    }, req: {
        ip: string;
        headers: Record<string, string>;
    }): Promise<{
        access_token: string;
        token_type: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../database/enums").Role;
            avatarUrl: string | null;
            twoFaEnabled: boolean;
        };
    } | {
        requires2FA: boolean;
        tempToken: string;
    }>;
    sendInvite(dto: InviteDto): Promise<void>;
    acceptInvite(dto: AcceptInviteDto): Promise<void>;
    forgotPassword(dto: ForgotPasswordDto): Promise<void>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        resetToken: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<void>;
    setup2FA(user: {
        id: string;
    }): Promise<{
        secret: string;
        qrDataUrl: string;
    }>;
    enable2FA(user: {
        id: string;
    }, dto: Verify2FADto): Promise<void>;
    disable2FA(user: {
        id: string;
    }, dto: Verify2FADto): Promise<void>;
    getSessions(user: {
        id: string;
    }): Promise<import("../database/entities").UserSession[]>;
    revokeSession(user: {
        id: string;
    }, sessionId: string): Promise<void>;
    revokeAllSessions(user: {
        id: string;
    }): Promise<void>;
    getLoginHistory(user: {
        id: string;
    }): Promise<import("../database/entities").LoginLog[]>;
}
export {};
