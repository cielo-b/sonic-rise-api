import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Role } from '../enums';
import { Booking } from './booking.entity';

@Entity('users')
@Index(['role'])
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** Bcrypt hash — never serialised to API responses. */
  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role: Role;

  /**
   * Soft-delete flag. Deactivated accounts cannot authenticate but all
   * related bookings and payment records are preserved for audit purposes.
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  company: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null; // e.g., 'CORPORATE', 'ARTIST', 'AGENCY'

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Signed UUID sent in the invitation email link. */
  @Column({ type: 'varchar', length: 36, nullable: true, select: false })
  inviteToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  inviteExpiry: Date | null;

  /** SHA-256 hash of the 6-digit OTP sent for password reset. */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  otpHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  otpExpiry: Date | null;

  /** Short-lived UUID token issued after OTP verification. */
  @Column({ type: 'varchar', length: 36, nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetTokenExpiry: Date | null;

  /** TOTP secret for 2FA (base32 encoded, never serialised). */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  twoFaSecret: string | null;

  @Column({ type: 'boolean', default: false })
  twoFaEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────
  @OneToMany(() => Booking, (booking) => booking.client, { lazy: true })
  bookings: Promise<Booking[]>;
}
