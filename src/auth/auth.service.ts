import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt, randomUUID } from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User, LoginLog, UserSession, Studio } from '../database/entities';
import { Role } from '../database/enums';
import { assignableRoles } from '../common/permissions';
import { RegisterDto } from './dto/register.dto';
import { InviteDto } from './dto/invite.dto';
import { MailService } from '../mail/mail.service';

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Studio)
    private readonly studioRepo: Repository<Studio>,
    @InjectRepository(LoginLog)
    private readonly loginLogRepo: Repository<LoginLog>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────
  private parseDevice(userAgent?: string): string {
    if (!userAgent) return 'Unknown device';
    if (/iphone/i.test(userAgent)) return 'iPhone';
    if (/android/i.test(userAgent)) return 'Android';
    if (/mobile/i.test(userAgent)) return 'Mobile Browser';
    if (/chrome/i.test(userAgent)) return 'Chrome on Desktop';
    if (/safari/i.test(userAgent)) return 'Safari on Desktop';
    if (/firefox/i.test(userAgent)) return 'Firefox on Desktop';
    return 'Desktop Browser';
  }

  /** An account in a studio, or a platform admin when studioId is null. */
  private findAccount(
    studioId: string | null,
    email: string,
    extraSelect: string[] = [],
  ) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() });
    for (const col of extraSelect) qb.addSelect(`u.${col}`);
    if (studioId) qb.andWhere('u.studioId = :studioId', { studioId });
    else
      qb.andWhere('u.studioId IS NULL').andWhere('u.role = :r', {
        r: Role.PLATFORM_ADMIN,
      });
    return qb.getOne();
  }

  private async studioName(studioId: string | null): Promise<string> {
    if (!studioId) return 'Studio Platform';
    const studio = await this.studioRepo.findOne({ where: { id: studioId } });
    return studio?.name ?? 'Studio';
  }

  // ─── Login log ──────────────────────────────────────────────────────────────
  async logLoginAttempt(
    userId: string,
    status: 'success' | 'failed',
    ip?: string,
    userAgent?: string,
  ) {
    try {
      await this.loginLogRepo.save(
        this.loginLogRepo.create({
          userId,
          status,
          ipAddress: ip || null,
          userAgent: userAgent || null,
          device: this.parseDevice(userAgent),
        }),
      );
    } catch {
      /* non-critical */
    }
  }

  getLoginHistory(userId: string) {
    return this.loginLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // ─── Sessions ───────────────────────────────────────────────────────────────
  private async createSession(
    userId: string,
    jti: string,
    ip?: string,
    userAgent?: string,
  ) {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '7d');
    const days = expiresIn.endsWith('d') ? parseInt(expiresIn, 10) : 7;
    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId,
        jti,
        device: this.parseDevice(userAgent),
        ipAddress: ip || null,
        expiresAt: new Date(Date.now() + days * 86_400_000),
      }),
    );
  }

  getActiveSessions(userId: string) {
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

  // ─── 2FA ────────────────────────────────────────────────────────────────────
  async generate2FASecret(
    userId: string,
  ): Promise<{ secret: string; qrDataUrl: string }> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const issuer = await this.studioName(user.studioId);
    const secretObj = speakeasy.generateSecret({
      name: `${issuer} (${user.email})`,
      issuer,
    });
    const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url!);
    await this.userRepo.update(userId, { twoFaSecret: secretObj.base32 });
    return { secret: secretObj.base32, qrDataUrl };
  }

  private async totpSecret(userId: string): Promise<string | null> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.twoFaSecret')
      .where('u.id = :id', { id: userId })
      .getOne();
    return user?.twoFaSecret ?? null;
  }

  private checkTotp(secret: string, code: string) {
    return speakeasy.totp.verify({
      token: code,
      secret,
      encoding: 'base32',
      window: 1,
    });
  }

  async enable2FA(userId: string, code: string): Promise<void> {
    const secret = await this.totpSecret(userId);
    if (!secret) throw new BadRequestException('Set up 2FA first');
    if (!this.checkTotp(secret, code))
      throw new BadRequestException('Invalid 2FA code');
    await this.userRepo.update(userId, { twoFaEnabled: true });
  }

  async disable2FA(userId: string, code: string): Promise<void> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const secret = await this.totpSecret(userId);
    if (!user.twoFaEnabled || !secret)
      throw new BadRequestException('2FA is not enabled');
    if (!this.checkTotp(secret, code))
      throw new BadRequestException('Invalid 2FA code');
    await this.userRepo.update(userId, {
      twoFaEnabled: false,
      twoFaSecret: null,
    });
  }

  // ─── Register (clients) ─────────────────────────────────────────────────────
  async register(
    studioId: string,
    dto: RegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    if (!dto.acceptPrivacy) {
      throw new BadRequestException(
        'Please accept the privacy policy to create an account',
      );
    }
    if (await this.findAccount(studioId, dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.userRepo.save(
      this.userRepo.create({
        studioId,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone ?? null,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: Role.CLIENT,
        preferredLocale: dto.locale ?? null,
        consentAt: new Date(),
        marketingOptIn: dto.marketingOptIn ?? false,
      }),
    );
    return this.signToken(user, ip, userAgent);
  }

  // ─── Login ──────────────────────────────────────────────────────────────────
  async login(
    studioId: string | null,
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.findAccount(studioId, email, ['passwordHash']);
    const valid = !!user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid) {
      if (user) await this.logLoginAttempt(user.id, 'failed', ip, userAgent);
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive || user.anonymizedAt)
      throw new UnauthorizedException('Account is not active');

    await this.logLoginAttempt(user.id, 'success', ip, userAgent);
    if (user.twoFaEnabled) {
      const tempToken = this.jwt.sign(
        { sub: user.id, sid: user.studioId, role: user.role, pending2fa: true },
        { expiresIn: '5m' },
      );
      return { requires2FA: true as const, tempToken };
    }
    return this.signToken(user, ip, userAgent);
  }

  async loginWith2FA(
    tempToken: string,
    code: string,
    ip?: string,
    userAgent?: string,
  ) {
    let payload: { sub: string; pending2fa?: boolean };
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (!payload.pending2fa)
      throw new UnauthorizedException('Token is not a 2FA challenge');
    const secret = await this.totpSecret(payload.sub);
    if (!secret || !this.checkTotp(secret, code))
      throw new UnauthorizedException('Invalid 2FA code');
    const user = await this.userRepo.findOneOrFail({
      where: { id: payload.sub },
    });
    return this.signToken(user, ip, userAgent);
  }

  /** Fresh token for the signed-in user (the old session stays valid until it expires). */
  async refresh(user: User, ip?: string, userAgent?: string) {
    return this.signToken(user, ip, userAgent);
  }

  // ─── Staff invites ──────────────────────────────────────────────────────────
  async sendInvite(
    studioId: string,
    inviter: User,
    dto: InviteDto,
  ): Promise<{ inviteUrl: string }> {
    if (!assignableRoles(inviter.role).includes(dto.role)) {
      throw new ForbiddenException('You cannot invite someone with that role');
    }
    if (await this.findAccount(studioId, dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const inviteToken = randomUUID();
    await this.userRepo.save(
      this.userRepo.create({
        studioId,
        name: dto.name?.trim() || dto.email.split('@')[0],
        email: dto.email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(randomUUID(), 4),
        role: dto.role,
        isBookable: dto.isBookable ?? dto.role === Role.ENGINEER,
        isActive: false,
        inviteToken,
        inviteExpiry: new Date(Date.now() + 7 * 86_400_000),
      }),
    );
    const inviteUrl = await this.mail.sendInvite(
      studioId,
      dto.email,
      inviteToken,
    );
    return { inviteUrl };
  }

  /** Who an invite is for, so the accept page can show it. */
  async describeInvite(token: string) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.inviteToken')
      .where('u.inviteToken = :token', { token })
      .getOne();
    if (!user || !user.inviteExpiry || user.inviteExpiry < new Date()) {
      throw new NotFoundException('Invitation not found or expired');
    }
    return {
      email: user.email,
      name: user.name,
      role: user.role,
      studio: await this.studioName(user.studioId),
    };
  }

  async acceptInvite(
    token: string,
    name: string,
    password: string,
  ): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.inviteToken')
      .where('u.inviteToken = :token', { token })
      .getOne();
    if (!user?.inviteExpiry)
      throw new BadRequestException('Invalid or expired invitation link');
    if (new Date() > user.inviteExpiry) {
      throw new BadRequestException(
        'Invitation has expired — ask an admin to resend it',
      );
    }
    await this.userRepo.update(user.id, {
      name: name.trim(),
      passwordHash: await bcrypt.hash(password, 12),
      isActive: true,
      inviteToken: null,
      inviteExpiry: null,
      consentAt: new Date(),
    });
  }

  // ─── Password reset ─────────────────────────────────────────────────────────
  async forgotPassword(studioId: string | null, email: string): Promise<void> {
    const user = await this.findAccount(studioId, email);
    if (!user || !user.isActive) return; // never reveal whether an account exists

    const otp = randomInt(100_000, 1_000_000).toString();
    await this.userRepo.update(user.id, {
      otpHash: createHash('sha256').update(otp).digest('hex'),
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
      resetToken: null,
      resetTokenExpiry: null,
    });
    await this.mail.sendOtp(user.studioId, user.email, user.name, otp);
  }

  async verifyOtp(
    studioId: string | null,
    email: string,
    otp: string,
  ): Promise<{ resetToken: string }> {
    const user = await this.findAccount(studioId, email, [
      'otpHash',
      'otpAttempts',
    ]);
    if (!user?.otpHash || !user.otpExpiry) {
      throw new BadRequestException('No reset request found for this email');
    }
    if (new Date() > user.otpExpiry || user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException(
        'Code has expired — please request a new one',
      );
    }
    if (createHash('sha256').update(otp).digest('hex') !== user.otpHash) {
      await this.userRepo.update(user.id, {
        otpAttempts: user.otpAttempts + 1,
      });
      throw new BadRequestException('Incorrect code');
    }
    const resetToken = randomUUID();
    await this.userRepo.update(user.id, {
      otpHash: null,
      otpExpiry: null,
      otpAttempts: 0,
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
    });
    return { resetToken };
  }

  async resetPassword(resetToken: string, password: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.resetToken')
      .where('u.resetToken = :resetToken', { resetToken })
      .getOne();
    if (!user?.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    await this.userRepo.update(user.id, {
      passwordHash: await bcrypt.hash(password, 12),
      resetToken: null,
      resetTokenExpiry: null,
    });
    // A reset signs the account out everywhere.
    await this.revokeAllSessions(user.id);
  }

  // ─── Token signing ──────────────────────────────────────────────────────────
  private async signToken(user: User, ip?: string, userAgent?: string) {
    const jti = randomUUID();
    const token = this.jwt.sign({
      sub: user.id,
      sid: user.studioId,
      role: user.role,
      jti,
    });
    await this.createSession(user.id, jti, ip, userAgent);
    return {
      access_token: token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        studioId: user.studioId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        twoFaEnabled: user.twoFaEnabled,
      },
    };
  }
}
