import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from './transformers';

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

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
