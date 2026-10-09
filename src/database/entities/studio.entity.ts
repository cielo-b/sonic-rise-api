import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from './transformers';

/** A weekday's opening window in studio local time, e.g. { open: '09:00', close: '22:00' }. */
export interface OpeningWindow {
  open: string;
  close: string;
}

/** 0 = Sunday … 6 = Saturday. A missing day means closed. */
export type OpeningHours = Partial<
  Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', OpeningWindow>
>;

export interface StudioStat {
  label: string;
  value: string;
}

export interface StudioTestimonial {
  name: string;
  role?: string;
  quote: string;
}

export interface StudioFaq {
  question: string;
  answer: string;
}

/**
 * Everything the public website shows that is not a record of its own
 * (bookings, posts, portfolio…). Edited by the studio in the admin panel;
 * empty sections are simply not shown on the site.
 */
export interface StudioContent {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  aboutTitle?: string;
  aboutBody?: string;
  aboutImageUrl?: string;
  stats?: StudioStat[];
  testimonials?: StudioTestimonial[];
  faq?: StudioFaq[];
  rules?: string[];
  privacyPolicy?: string;
  termsOfService?: string;
}

export interface StudioSocials {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  x?: string;
  facebook?: string;
}

@Entity('studios')
export class Studio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Subdomain and X-Studio header value, e.g. "sonicrise". */
  @Column({ type: 'varchar', length: 63, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tagline: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 9, default: '#7C3AED' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 9, default: '#3CD7FF' })
  accentColor: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 2, default: 'RW' })
  country: string;

  @Column({ type: 'varchar', length: 64, default: 'Africa/Kigali' })
  timezone: string;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  /** RWF per 1 USD, set by the studio. Null = USD prices are not shown. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  usdRate: number | null;

  @Column({ type: 'varchar', length: 5, default: 'en' })
  defaultLocale: string;

  /** Share of the booking total due when booking online (0 = no deposit). */
  @Column({ type: 'integer', default: 0 })
  depositPercent: number;

  /** Free cancellation up to this many hours before the session. */
  @Column({ type: 'integer', default: 24 })
  cancellationHours: number;

  /** Minutes kept free between back-to-back sessions in the same room. */
  @Column({ type: 'integer', default: 0 })
  bufferMinutes: number;

  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string | null;

  @Column({ type: 'jsonb', default: {} })
  openingHours: OpeningHours;

  @Column({ type: 'jsonb', default: {} })
  content: StudioContent;

  @Column({ type: 'jsonb', default: {} })
  socials: StudioSocials;

  // ── pawaPay (mobile money). The API token is encrypted at rest. ────────
  @Column({ type: 'text', nullable: true, select: false })
  pawapayApiTokenEnc: string | null;

  /** pawaPay sandbox vs production API. */
  @Column({ type: 'boolean', default: true })
  pawapaySandbox: boolean;

  /** Next numbers for quotes and invoices (per studio). */
  @Column({ type: 'integer', default: 1 })
  nextQuoteNumber: number;

  @Column({ type: 'integer', default: 1 })
  nextInvoiceNumber: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
