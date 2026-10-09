import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InvoiceStatus } from '../enums';
import { User } from './user.entity';
import type { LineItem } from './quote.entity';
import { decimalTransformer } from './transformers';

@Entity('invoices')
@Index(['studioId', 'number'], { unique: true })
@Index(['studioId', 'status'])
@Index(['clientId'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  /** Sequential per studio, e.g. 7 → shown as INV-0007. */
  @Column({ type: 'integer' })
  number: number;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ type: 'uuid', nullable: true })
  quoteId: string | null;

  @Column({ type: 'uuid', nullable: true })
  bookingId: string | null;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'jsonb', default: [] })
  lines: LineItem[];

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  total: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  amountPaid: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  issuedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
