import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PricingType } from '../enums';
import { decimalTransformer } from './transformers';

/**
 * What clients book and pay for: a single service ("Vocal recording, per hour")
 * or a bundle ("Single: record, mix and master").
 */
@Entity('service_packages')
@Index(['studioId', 'isActive', 'sortOrder'])
export class ServicePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Free text used to group packages, e.g. "Audio", "Video", "Podcast". */
  @Column({ type: 'varchar', length: 60 })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Bullet points shown on the site, e.g. ["2h recording", "Mix", "Master"]. */
  @Column({ type: 'text', array: true, default: [] })
  includes: string[];

  @Column({ type: 'enum', enum: PricingType, default: PricingType.FIXED })
  pricingType: PricingType;

  /** In the studio's currency; per hour when pricingType is HOURLY. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  price: number;

  /** Default session length used to fill the end time. */
  @Column({ type: 'integer', default: 60 })
  durationMinutes: number;

  /** Overrides the studio deposit percentage for this package. */
  @Column({ type: 'integer', nullable: true })
  depositPercent: number | null;

  /** Rooms this package can be booked in; empty = any active room. */
  @Column({ type: 'uuid', array: true, default: [] })
  roomIds: string[];

  /** Clients can book it online (otherwise staff-only). */
  @Column({ type: 'boolean', default: true })
  bookableOnline: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
