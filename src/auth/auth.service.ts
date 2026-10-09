import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User, LoginLog, UserSession } from '../database/entities';
import { Role } from '../database/enums';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LoginLog)
    private readonly loginLogRepo: Repository<LoginLog>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ─── Helper: parse device from UA ───────────────────────────────────────────
  private parseDevice(userAgent?: string): string {
    if (!userAgent) return 'Unknown device';
    if (/mobile/i.test(userAgent)) return 'Mobile Browser';
    if (/iphone/i.test(userAgent)) return 'iPhone';
    if (/android/i.test(userAgent)) return 'Android';
    if (/chrome/i.test(userAgent)) return 'Chrome on Desktop';
    if (/safari/i.test(userAgent)) return 'Safari on Desktop';
    if (/firefox/i.test(userAgent)) return 'Firefox on Desktop';
    return 'Desktop Browser';
  }

  // ─── Login log ──────────────────────────────────────────────────────────────
  async logLoginAttempt(
    userId: string,
    status: 'success' | 'failed',
    ip?: string,
    userAgent?: string,
  ) {
    try {
      const log = this.loginLogRepo.create({
        userId,
        status,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        device: this.parseDevice(userAgent),
      });
      await this.loginLogRepo.save(log);
    } catch {
      /* non-critical */
    }
  }

  async getLoginHistory(userId: string) {
    return this.loginLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────
  async createSession(
    userId: string,
    jti: string,
    ip?: string,
    userAgent?: string,
  ) {
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

  async getActiveSessions(userId: string) {
    return this.sessionRepo.find({
      where: { userId, revoked: false },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) throw new BadRequestException('Session not found');
    session.revoked = true;
    await this.sessionRepo.save(session);
  }

  async revokeAllSessions(userId: string) {
    await this.sessionRepo.update(
      { userId, revoked: false },
      { revoked: true },
    );
  }

  async isSessionValid(jti: string): Promise<boolean> {
    const session = await this.sessionRepo.findOne({ where: { jti } });
    if (!session) return false;
    if (session.revoked) return false;
    if (new Date() > session.expiresAt) return false;
    return true;
  }

  // ─── 2FA ─────────────────────────────────────────────────────────────────────
  async generate2FASecret(
    userId: string,
  ): Promise<{ secret: string; qrDataUrl: string }> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const secretObj = speakeasy.generateSecret({
      name: `SonicRise (${user.email})`,
      issuer: 'SonicRise Studio',
    });
    const secret = secretObj.base32;
    const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url!);

    await this.userRepo.update(userId, { twoFaSecret: secret });
    return { secret, qrDataUrl };
  }

  async enable2FA(userId: string, code: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.twoFaSecret')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user?.twoFaSecret) throw new BadRequestException('Setup 2FA first');
    const valid = speakeasy.totp.verify({
      token: code,
      secret: user.twoFaSecret,
      encoding: 'base32',
      window: 1,
    });
    if (!valid) throw new BadRequestException('Invalid 2FA code');
    await this.userRepo.update(userId, { twoFaEnabled: true });
  }

  async disable2FA(userId: string, code: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.twoFaSecret')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user?.twoFaEnabled || !user?.twoFaSecret)
      throw new BadRequestException('2FA is not enabled');
    const valid = speakeasy.totp.verify({
      token: code,
      secret: user.twoFaSecret,
      encoding: 'base32',
      window: 1,
    });
    if (!valid) throw new BadRequestException('Invalid 2FA code');
    await this.userRepo.update(userId, {
      twoFaEnabled: false,
      twoFaSecret: null,
    });
  }

  async verify2FACode(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.twoFaSecret')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user?.twoFaSecret) return false;
    return speakeasy.totp.verify({
      token: code,
      secret: user.twoFaSecret,
      encoding: 'base32',
      window: 1,
    });
  }

  // ─── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      role: Role.CLIENT,
    });
    await this.userRepo.save(user);
    return this.signToken(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
      .getOne();

    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async login(userId: string, ip?: string, userAgent?: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    if (!user.isActive) throw new UnauthorizedException('Account suspended');

    // If 2FA is enabled, return a partial token that requires TOTP verification
    if (user.twoFaEnabled) {
      const tempToken = this.jwt.sign(
        { sub: user.id, email: user.email, role: user.role, pending2fa: true },
        { expiresIn: '5m' },
      );
      await this.logLoginAttempt(userId, 'success', ip, userAgent);
      return { requires2FA: true, tempToken };
    }

    await this.logLoginAttempt(userId, 'success', ip, userAgent);
    return this.signToken(user, ip, userAgent);
  }

  async loginWith2FA(
    tempToken: string,
    code: string,
    ip?: string,
    userAgent?: string,
  ) {
    let payload: any;
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (!payload.pending2fa)
      throw new UnauthorizedException('Token is not a 2FA challenge');

    const valid = await this.verify2FACode(payload.sub, code);
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    const user = await this.userRepo.findOneOrFail({
      where: { id: payload.sub },
    });
    return this.signToken(user, ip, userAgent);
  }

  // ─── Invite flow ─────────────────────────────────────────────────────────────
  async sendInvite(email: string, role?: Role): Promise<{ inviteUrl: string }> {
    const existing = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
    if (existing) throw new ConflictException('Email already registered');

    const inviteToken = randomUUID();
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const placeholder = this.userRepo.create({
      name: email.split('@')[0],
      email,
      passwordHash: await bcrypt.hash(randomUUID(), 4),
      role: role ?? Role.CLIENT,
      isActive: false,
      inviteToken,
      inviteExpiry,
    });
    await this.userRepo.save(placeholder);
    const inviteUrl = await this.mail.sendInvite(email, inviteToken);
    return { inviteUrl };
  }

  async acceptInvite(
    token: string,
    name: string,
    password: string,
  ): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.inviteToken')
      .addSelect('u.inviteExpiry')
      .where('u.inviteToken = :token', { token })
      .getOne();

    if (!user?.inviteToken || !user?.inviteExpiry) {
      throw new BadRequestException('Invalid or expired invitation link');
    }
    if (new Date() > user.inviteExpiry) {
      throw new BadRequestException(
        'Invitation has expired — ask an admin to resend it',
      );
    }

    await this.userRepo.update(user.id, {
      name,
      passwordHash: await bcrypt.hash(password, 12),
      isActive: true,
      inviteToken: null,
      inviteExpiry: null,
    });
  }

  // ─── Password reset ───────────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return;

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

  async verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.otpHash')
      .addSelect('u.otpExpiry')
      .where('u.email = :email', { email })
      .getOne();

    if (!user?.otpHash || !user?.otpExpiry) {
      throw new BadRequestException('No reset request found for this email');
    }
    if (new Date() > user.otpExpiry) {
      throw new BadRequestException(
        'Code has expired — please request a new one',
      );
    }

    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== user.otpHash) throw new BadRequestException('Incorrect code');

    const resetToken = randomUUID();
    user.otpHash = null;
    user.otpExpiry = null;
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await this.userRepo.save(user);
    return { resetToken };
  }

  async resetPassword(resetToken: string, password: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.resetToken')
      .addSelect('u.resetTokenExpiry')
      .where('u.resetToken = :resetToken', { resetToken })
      .getOne();

    if (!user?.resetToken || !user?.resetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (new Date() > user.resetTokenExpiry) {
      throw new BadRequestException(
        'Reset link has expired — please start over',
      );
    }

    await this.userRepo.update(user.id, {
      passwordHash: await bcrypt.hash(password, 12),
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  // ─── Token signing ────────────────────────────────────────────────────────────
  private async signToken(user: User, ip?: string, userAgent?: string) {
    const jti = randomUUID();
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
}
