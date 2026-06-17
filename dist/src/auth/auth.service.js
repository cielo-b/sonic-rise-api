"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const speakeasy = __importStar(require("speakeasy"));
const QRCode = __importStar(require("qrcode"));
const entities_1 = require("../database/entities");
const enums_1 = require("../database/enums");
const mail_service_1 = require("../mail/mail.service");
let AuthService = class AuthService {
    userRepo;
    loginLogRepo;
    sessionRepo;
    jwt;
    config;
    mail;
    constructor(userRepo, loginLogRepo, sessionRepo, jwt, config, mail) {
        this.userRepo = userRepo;
        this.loginLogRepo = loginLogRepo;
        this.sessionRepo = sessionRepo;
        this.jwt = jwt;
        this.config = config;
        this.mail = mail;
    }
    parseDevice(userAgent) {
        if (!userAgent)
            return 'Unknown device';
        if (/mobile/i.test(userAgent))
            return 'Mobile Browser';
        if (/iphone/i.test(userAgent))
            return 'iPhone';
        if (/android/i.test(userAgent))
            return 'Android';
        if (/chrome/i.test(userAgent))
            return 'Chrome on Desktop';
        if (/safari/i.test(userAgent))
            return 'Safari on Desktop';
        if (/firefox/i.test(userAgent))
            return 'Firefox on Desktop';
        return 'Desktop Browser';
    }
    async logLoginAttempt(userId, status, ip, userAgent) {
        try {
            const log = this.loginLogRepo.create({
                userId,
                status,
                ipAddress: ip || null,
                userAgent: userAgent || null,
                device: this.parseDevice(userAgent),
            });
            await this.loginLogRepo.save(log);
        }
        catch { }
    }
    async getLoginHistory(userId) {
        return this.loginLogRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 20,
        });
    }
    async createSession(userId, jti, ip, userAgent) {
        const expiresIn = this.config.get('JWT_EXPIRES_IN', '7d');
        const ms = expiresIn.endsWith('d')
            ? parseInt(expiresIn) * 86400 * 1000
            : 7 * 86400 * 1000;
        const expiresAt = new Date(Date.now() + ms);
        const session = this.sessionRepo.create({
            userId,
            jti,
            device: this.parseDevice(userAgent),
            ipAddress: ip || null,
            expiresAt,
        });
        await this.sessionRepo.save(session);
    }
    async getActiveSessions(userId) {
        return this.sessionRepo.find({
            where: { userId, revoked: false },
            order: { createdAt: 'DESC' },
        });
    }
    async revokeSession(userId, sessionId) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
        if (!session)
            throw new common_1.BadRequestException('Session not found');
        session.revoked = true;
        await this.sessionRepo.save(session);
    }
    async revokeAllSessions(userId) {
        await this.sessionRepo.update({ userId, revoked: false }, { revoked: true });
    }
    async isSessionValid(jti) {
        const session = await this.sessionRepo.findOne({ where: { jti } });
        if (!session)
            return false;
        if (session.revoked)
            return false;
        if (new Date() > session.expiresAt)
            return false;
        return true;
    }
    async generate2FASecret(userId) {
        const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
        const secretObj = speakeasy.generateSecret({ name: `SonicRise (${user.email})`, issuer: 'SonicRise Studio' });
        const secret = secretObj.base32;
        const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url);
        await this.userRepo.update(userId, { twoFaSecret: secret });
        return { secret, qrDataUrl };
    }
    async enable2FA(userId, code) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.twoFaSecret')
            .where('u.id = :id', { id: userId })
            .getOne();
        if (!user?.twoFaSecret)
            throw new common_1.BadRequestException('Setup 2FA first');
        const valid = speakeasy.totp.verify({ token: code, secret: user.twoFaSecret, encoding: 'base32', window: 1 });
        if (!valid)
            throw new common_1.BadRequestException('Invalid 2FA code');
        await this.userRepo.update(userId, { twoFaEnabled: true });
    }
    async disable2FA(userId, code) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.twoFaSecret')
            .where('u.id = :id', { id: userId })
            .getOne();
        if (!user?.twoFaEnabled || !user?.twoFaSecret)
            throw new common_1.BadRequestException('2FA is not enabled');
        const valid = speakeasy.totp.verify({ token: code, secret: user.twoFaSecret, encoding: 'base32', window: 1 });
        if (!valid)
            throw new common_1.BadRequestException('Invalid 2FA code');
        await this.userRepo.update(userId, { twoFaEnabled: false, twoFaSecret: null });
    }
    async verify2FACode(userId, code) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.twoFaSecret')
            .where('u.id = :id', { id: userId })
            .getOne();
        if (!user?.twoFaSecret)
            return false;
        return speakeasy.totp.verify({ token: code, secret: user.twoFaSecret, encoding: 'base32', window: 1 });
    }
    async register(dto) {
        const exists = await this.userRepo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already registered');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = this.userRepo.create({
            name: dto.name,
            email: dto.email,
            phone: dto.phone ?? null,
            passwordHash,
            role: enums_1.Role.CLIENT,
        });
        await this.userRepo.save(user);
        return this.signToken(user);
    }
    async validateUser(email, password) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
            .getOne();
        if (!user)
            return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        return valid ? user : null;
    }
    async login(userId, ip, userAgent) {
        const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
        if (!user.isActive)
            throw new common_1.UnauthorizedException('Account suspended');
        if (user.twoFaEnabled) {
            const tempToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, pending2fa: true }, { expiresIn: '5m' });
            await this.logLoginAttempt(userId, 'success', ip, userAgent);
            return { requires2FA: true, tempToken };
        }
        await this.logLoginAttempt(userId, 'success', ip, userAgent);
        return this.signToken(user, ip, userAgent);
    }
    async loginWith2FA(tempToken, code, ip, userAgent) {
        let payload;
        try {
            payload = this.jwt.verify(tempToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
        if (!payload.pending2fa)
            throw new common_1.UnauthorizedException('Token is not a 2FA challenge');
        const valid = await this.verify2FACode(payload.sub, code);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid 2FA code');
        const user = await this.userRepo.findOneOrFail({ where: { id: payload.sub } });
        return this.signToken(user, ip, userAgent);
    }
    async sendInvite(email, role) {
        const existing = await this.userRepo.createQueryBuilder('u')
            .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
            .getOne();
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const inviteToken = (0, crypto_1.randomUUID)();
        const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const placeholder = this.userRepo.create({
            name: email.split('@')[0],
            email,
            passwordHash: await bcrypt.hash((0, crypto_1.randomUUID)(), 4),
            role: role ?? enums_1.Role.CLIENT,
            isActive: false,
            inviteToken,
            inviteExpiry,
        });
        await this.userRepo.save(placeholder);
        await this.mail.sendInvite(email, inviteToken);
    }
    async acceptInvite(token, name, password) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.inviteToken')
            .addSelect('u.inviteExpiry')
            .where('u.inviteToken = :token', { token })
            .getOne();
        if (!user?.inviteToken || !user?.inviteExpiry) {
            throw new common_1.BadRequestException('Invalid or expired invitation link');
        }
        if (new Date() > user.inviteExpiry) {
            throw new common_1.BadRequestException('Invitation has expired — ask an admin to resend it');
        }
        await this.userRepo.update(user.id, {
            name,
            passwordHash: await bcrypt.hash(password, 12),
            isActive: true,
            inviteToken: null,
            inviteExpiry: null,
        });
    }
    async forgotPassword(email) {
        const user = await this.userRepo.findOne({ where: { email } });
        if (!user)
            return;
        const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        user.otpHash = otpHash;
        user.otpExpiry = otpExpiry;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await this.userRepo.save(user);
        await this.mail.sendOtp(user.email, user.name, otp);
    }
    async verifyOtp(email, otp) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.otpHash')
            .addSelect('u.otpExpiry')
            .where('u.email = :email', { email })
            .getOne();
        if (!user?.otpHash || !user?.otpExpiry) {
            throw new common_1.BadRequestException('No reset request found for this email');
        }
        if (new Date() > user.otpExpiry) {
            throw new common_1.BadRequestException('Code has expired — please request a new one');
        }
        const hash = crypto.createHash('sha256').update(otp).digest('hex');
        if (hash !== user.otpHash)
            throw new common_1.BadRequestException('Incorrect code');
        const resetToken = (0, crypto_1.randomUUID)();
        user.otpHash = null;
        user.otpExpiry = null;
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
        await this.userRepo.save(user);
        return { resetToken };
    }
    async resetPassword(resetToken, password) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.resetToken')
            .addSelect('u.resetTokenExpiry')
            .where('u.resetToken = :resetToken', { resetToken })
            .getOne();
        if (!user?.resetToken || !user?.resetTokenExpiry) {
            throw new common_1.BadRequestException('Invalid or expired reset link');
        }
        if (new Date() > user.resetTokenExpiry) {
            throw new common_1.BadRequestException('Reset link has expired — please start over');
        }
        await this.userRepo.update(user.id, {
            passwordHash: await bcrypt.hash(password, 12),
            resetToken: null,
            resetTokenExpiry: null,
        });
    }
    async signToken(user, ip, userAgent) {
        const jti = (0, crypto_1.randomUUID)();
        const payload = { sub: user.id, email: user.email, role: user.role, jti };
        const token = this.jwt.sign(payload);
        await this.createSession(user.id, jti, ip, userAgent);
        return {
            access_token: token,
            token_type: 'Bearer',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
                twoFaEnabled: user.twoFaEnabled,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.LoginLog)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.UserSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map