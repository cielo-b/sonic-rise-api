import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  Booking,
  DeliverableComment,
  Invoice,
  LoginLog,
  Payment,
  Project,
  Quote,
  User,
  UserSession,
} from '../database/entities';
import { Role, STAFF_ROLES } from '../database/enums';
import { assignableRoles } from '../common/permissions';
import { MailService } from '../mail/mail.service';
import { DeleteAccountDto, UpdateMeDto } from './dto/update-me.dto';
import { UpdateTeamMemberDto } from './dto/team.dto';

/** What a user sees about their own account. */
export function profile(u: User) {
  return {
    id: u.id,
    studioId: u.studioId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatarUrl,
    company: u.company,
    preferredLocale: u.preferredLocale,
    marketingOptIn: u.marketingOptIn,
    twoFaEnabled: u.twoFaEnabled,
    isBookable: u.isBookable,
    consentAt: u.consentAt,
    createdAt: u.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LoginLog) private readonly logins: Repository<LoginLog>,
    private readonly mail: MailService,
  ) {}

  private async checkPassword(id: string, password?: string) {
    const withHash = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    const ok =
      !!password &&
      !!withHash &&
      (await bcrypt.compare(password, withHash.passwordHash));
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
  }

  // ─── Me ────────────────────────────────────────────────────────────────────
  async me(id: string) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException();
    return profile(u);
  }

  async updateMe(user: User, dto: UpdateMeDto) {
    const { currentPassword, password, email, ...rest } = dto;
    const emailChanged =
      !!email && email.toLowerCase() !== user.email.toLowerCase();
    if (password || emailChanged)
      await this.checkPassword(user.id, currentPassword);

    const patch: Partial<User> = { ...rest };
    if (emailChanged) {
      const taken = await this.users
        .createQueryBuilder('u')
        .where('LOWER(u.email) = LOWER(:email)', { email })
        .andWhere(user.studioId ? 'u.studioId = :sid' : 'u.studioId IS NULL', {
          sid: user.studioId,
        })
        .andWhere('u.id <> :id', { id: user.id })
        .getExists();
      if (taken) throw new ConflictException('Email already registered');
      patch.email = email.trim().toLowerCase();
    }
    if (password) patch.passwordHash = await bcrypt.hash(password, 12);
    if (Object.keys(patch).length) await this.users.update(user.id, patch);
    return this.me(user.id);
  }

  /** Everything the platform holds about the user (data protection: right of access). */
  async exportMine(user: User) {
    const m = this.db.manager;
    const [bookings, payments, projects, quotes, invoices, comments, logins] =
      await Promise.all([
        m.find(Booking, {
          where: { clientId: user.id },
          relations: { package: true, room: true },
        }),
        m.find(Payment, { where: { payerId: user.id } }),
        m.find(Project, { where: { clientId: user.id } }),
        m.find(Quote, { where: { clientId: user.id } }),
        m.find(Invoice, { where: { clientId: user.id } }),
        m.find(DeliverableComment, { where: { authorId: user.id } }),
        this.logins.find({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
        }),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: profile(user),
      bookings: bookings.map(({ internalNotes: _n, ...b }) => b),
      payments: payments.map(({ gatewayResponse: _g, ...p }) => p),
      projects,
      quotes,
      invoices,
      comments,
      loginHistory: logins,
    };
  }

  /**
   * Erases personal data but keeps financial records (bookings, invoices,
   * payments) that the studio must retain, now linked to an anonymous account.
   */
  async deleteMine(user: User, dto: DeleteAccountDto) {
    await this.checkPassword(user.id, dto.password);
    if (user.role === Role.OWNER && user.studioId) {
      const owners = await this.users.count({
        where: { studioId: user.studioId, role: Role.OWNER, isActive: true },
      });
      if (owners <= 1)
        throw new BadRequestException(
          'Make someone else an owner before deleting your account',
        );
    }
    await this.db.transaction(async (m) => {
      await m.update(
        User,
        { id: user.id },
        {
          name: 'Deleted user',
          email: `deleted+${user.id}@invalid.local`,
          phone: null,
          avatarUrl: null,
          company: null,
          notes: null,
          category: null,
          passwordHash: await bcrypt.hash(randomUUID(), 4),
          twoFaEnabled: false,
          twoFaSecret: null,
          marketingOptIn: false,
          isActive: false,
          anonymizedAt: new Date(),
        },
      );
      await m.update(UserSession, { userId: user.id }, { revoked: true });
      await m.delete(LoginLog, { userId: user.id });
    });
    return { deleted: true };
  }

  // ─── Team ──────────────────────────────────────────────────────────────────
  async team(studioId: string) {
    const members = await this.users
      .createQueryBuilder('u')
      .addSelect('u.inviteToken')
      .where('u.studioId = :studioId', { studioId })
      .andWhere('u.role IN (:...roles)', { roles: STAFF_ROLES })
      .andWhere('u.anonymizedAt IS NULL')
      .orderBy('u.createdAt', 'ASC')
      .getMany();
    const last = members.length
      ? await this.logins
          .createQueryBuilder('l')
          .select('l.userId', 'userId')
          .addSelect('MAX(l.createdAt)', 'at')
          .where('l.userId IN (:...ids)', { ids: members.map((u) => u.id) })
          .andWhere("l.status = 'success'")
          .groupBy('l.userId')
          .getRawMany<{ userId: string; at: Date }>()
      : [];
    const lastById = new Map(last.map((r) => [r.userId, r.at]));
    return members.map((u) => ({
      ...profile(u),
      isActive: u.isActive,
      invitePending: !!u.inviteToken,
      inviteExpiry: u.inviteToken ? u.inviteExpiry : null,
      lastLoginAt: lastById.get(u.id) ?? null,
    }));
  }

  private async member(studioId: string, id: string) {
    const u = await this.users.findOne({
      where: { id, studioId, role: In([...STAFF_ROLES]) },
    });
    if (!u) throw new NotFoundException('Team member not found');
    return u;
  }

  private async ensureAnotherOwner(studioId: string, exceptId: string) {
    const owners = await this.users.count({
      where: { studioId, role: Role.OWNER, isActive: true },
    });
    const target = await this.users.findOne({ where: { id: exceptId } });
    if (target?.role === Role.OWNER && target.isActive && owners <= 1) {
      throw new BadRequestException('A studio needs at least one active owner');
    }
  }

  async updateMember(
    studioId: string,
    actor: User,
    id: string,
    dto: UpdateTeamMemberDto,
  ) {
    const target = await this.member(studioId, id);
    const allowed = assignableRoles(actor.role);
    // Managers can't change owners, and nobody can grant a role they can't assign.
    if (
      !allowed.includes(target.role) ||
      (dto.role && !allowed.includes(dto.role))
    ) {
      throw new ForbiddenException('You cannot change this person’s access');
    }
    if ((dto.role && dto.role !== Role.OWNER) || dto.isActive === false) {
      await this.ensureAnotherOwner(studioId, id);
    }
    await this.users.update(id, {
      ...(dto.role && { role: dto.role }),
      ...(dto.isBookable !== undefined && { isBookable: dto.isBookable }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.name && { name: dto.name.trim() }),
    });
    if (dto.isActive === false || (dto.role && dto.role !== target.role)) {
      // Access changed: sign them out so the new rights apply immediately.
      await this.db.manager.update(
        UserSession,
        { userId: id, revoked: false },
        { revoked: true },
      );
    }
    return (await this.team(studioId)).find((m) => m.id === id);
  }

  async resendInvite(studioId: string, actor: User, id: string) {
    const target = await this.member(studioId, id);
    if (!assignableRoles(actor.role).includes(target.role))
      throw new ForbiddenException();
    if (target.isActive)
      throw new BadRequestException('This person has already joined');
    const inviteToken = randomUUID();
    await this.users.update(id, {
      inviteToken,
      inviteExpiry: new Date(Date.now() + 7 * 86_400_000),
    });
    return {
      inviteUrl: await this.mail.sendInvite(
        studioId,
        target.email,
        inviteToken,
      ),
    };
  }

  async removePendingInvite(studioId: string, actor: User, id: string) {
    const target = await this.member(studioId, id);
    if (!assignableRoles(actor.role).includes(target.role))
      throw new ForbiddenException();
    if (target.isActive)
      throw new BadRequestException('Deactivate active members instead');
    await this.users.delete(id);
  }
}
