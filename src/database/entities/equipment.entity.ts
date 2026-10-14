import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from './transformers';
import { EquipmentStatus } from '../enums';

/** A single piece of gear that can be reserved with a session (one booking at a time). */
@Entity('equipment')
@Index(['studioId', 'isActive'])
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Free text, e.g. "Microphone", "Camera", "Lighting". */
  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Added to the booking total when reserved (0 = included). */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  pricePerBooking: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @Column({ type: 'date', nullable: true })
  purchaseDate: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  purchasePrice: number | null;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.OPERATIONAL,
  })
  status: EquipmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastMaintainedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  maintenanceNotes: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  maintenanceHistory: Array<{
    id: string;
    date: string;
    technician: string;
    description: string;
    cost?: number;
  }>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
