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
import { QuoteStatus } from '../enums';
import { User } from './user.entity';
import { decimalTransformer } from './transformers';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

@Entity('quotes')
@Index(['studioId', 'number'], { unique: true })
@Index(['studioId', 'status'])
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  /** Sequential per studio, e.g. 12 → shown as Q-0012. */
  @Column({ type: 'integer' })
  number: number;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client: User;

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

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ type: 'date', nullable: true })
  validUntil: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;

  @Column({ type: 'uuid' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
