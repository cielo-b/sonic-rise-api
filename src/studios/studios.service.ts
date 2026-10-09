import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Studio, User } from '../database/entities';
import { Role } from '../database/enums';
import { encryptSecret } from '../common/crypto';
import { MailService } from '../mail/mail.service';
import {
  CreateStudioDto,
  PaymentSettingsDto,
  UpdateStudioDto,
} from './dto/update-studio.dto';

/** Subdomains that can't be studio slugs. */
const RESERVED = new Set([
  'www',
  'api',
  'admin',
  'app',
  'platform',
  'mail',
  'static',
  'cdn',
]);

@Injectable()
export class StudiosService {
  constructor(
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly mail: MailService,
  ) {}

  /** What the public website needs. Never includes secrets. */
  publicProfile(studio: Studio) {
    return {
      id: studio.id,
      slug: studio.slug,
      name: studio.name,
      tagline: studio.tagline,
      logoUrl: studio.logoUrl,
      primaryColor: studio.primaryColor,
      accentColor: studio.accentColor,
      email: studio.email,
      phone: studio.phone,
      address: studio.address,
      city: studio.city,
      country: studio.country,
      timezone: studio.timezone,
      currency: studio.currency,
      usdRate: studio.usdRate,
      defaultLocale: studio.defaultLocale,
      depositPercent: studio.depositPercent,
      cancellationHours: studio.cancellationHours,
      cancellationPolicy: studio.cancellationPolicy,
      openingHours: studio.openingHours,
      content: studio.content,
      socials: studio.socials,
    };
  }

  async publicProfileById(studioId: string) {
    const studio = await this.studios.findOne({ where: { id: studioId } });
    if (!studio) throw new NotFoundException('Studio not found');
    return this.publicProfile(studio);
  }

  async settings(studioId: string) {
    const studio = await this.studios
      .createQueryBuilder('s')
      .addSelect('s.pawapayApiTokenEnc')
      .where('s.id = :id', { id: studioId })
      .getOne();
    if (!studio) throw new NotFoundException('Studio not found');
    return {
      ...this.publicProfile(studio),
      bufferMinutes: studio.bufferMinutes,
      payments: {
        provider: 'PAWAPAY',
        configured: !!studio.pawapayApiTokenEnc,
        sandbox: studio.pawapaySandbox,
      },
    };
  }

  async update(studioId: string, dto: UpdateStudioDto) {
    const studio = await this.studios.findOne({ where: { id: studioId } });
    if (!studio) throw new NotFoundException('Studio not found');
    const { content, openingHours, socials, ...fields } = dto;
    Object.assign(studio, fields);
    // Nested objects are replaced as a whole so removed items really disappear.
    if (content) studio.content = { ...studio.content, ...content };
    if (openingHours) studio.openingHours = openingHours;
    if (socials) studio.socials = socials;
    await this.studios.save(studio);
    return this.settings(studioId);
  }

  async setPayments(studioId: string, dto: PaymentSettingsDto) {
    await this.studios.update(studioId, {
      pawapayApiTokenEnc: dto.apiToken.trim()
        ? encryptSecret(dto.apiToken.trim())
        : null,
      pawapaySandbox: dto.sandbox,
    });
    return this.settings(studioId);
  }

  /** Has online payments set up (used by booking & invoice flows). */
  async paymentsEnabled(studioId: string): Promise<boolean> {
    const s = await this.studios
      .createQueryBuilder('s')
      .addSelect('s.pawapayApiTokenEnc')
      .where('s.id = :id', { id: studioId })
      .getOne();
    return !!s?.pawapayApiTokenEnc;
  }

  // ─── Platform ──────────────────────────────────────────────────────────────
  listAll() {
    return this.studios.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateStudioDto) {
    const slug = dto.slug.toLowerCase();
    if (RESERVED.has(slug))
      throw new ConflictException('That address is reserved');
    if (await this.studios.findOne({ where: { slug } })) {
      throw new ConflictException('That address is already taken');
    }
    const studio = await this.studios.save(
      this.studios.create({ name: dto.name.trim(), slug }),
    );

    const inviteToken = randomUUID();
    await this.users.save(
      this.users.create({
        studioId: studio.id,
        name: dto.ownerName?.trim() || dto.ownerEmail.split('@')[0],
        email: dto.ownerEmail.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(randomUUID(), 4),
        role: Role.OWNER,
        isActive: false,
        inviteToken,
        inviteExpiry: new Date(Date.now() + 7 * 86_400_000),
      }),
    );
    const inviteUrl = await this.mail.sendInvite(
      studio.id,
      dto.ownerEmail,
      inviteToken,
    );
    return { studio, inviteUrl };
  }

  async setActive(id: string, isActive: boolean) {
    const studio = await this.studios.findOne({ where: { id } });
    if (!studio) throw new NotFoundException('Studio not found');
    studio.isActive = isActive;
    return this.studios.save(studio);
  }
}
