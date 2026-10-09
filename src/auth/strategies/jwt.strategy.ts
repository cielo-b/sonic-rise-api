import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserSession } from '../../database/entities';
import { Role } from '../../database/enums';
import type { TenantRequest } from '../../common/tenant/tenant.middleware';

export interface JwtPayload {
  sub: string;
  sid: string | null;
  role: Role;
  jti?: string;
  pending2fa?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: TenantRequest, payload: JwtPayload): Promise<User> {
    // A 2FA challenge token only unlocks POST /auth/login/2fa.
    if (payload.pending2fa || !payload.jti) throw new UnauthorizedException();

    const session = await this.sessionRepo.findOne({
      where: { jti: payload.jti },
    });
    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or signed out');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.anonymizedAt) {
      throw new UnauthorizedException();
    }

    // A studio account only works on its own studio's site.
    if (
      user.role !== Role.PLATFORM_ADMIN &&
      req.studio &&
      req.studio.id !== user.studioId
    ) {
      throw new UnauthorizedException('This account belongs to another studio');
    }
    return user;
  }
}
