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
import {
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
} from '../enums';
import { Booking } from './booking.entity';
import { decimalTransformer } from './transformers';

/**
 * Money received for exactly one thing: a booking deposit/balance, an
 * invoice, or a paid deliverable download.
 */
@Entity('payments')
@Index(['studioId', 'status', 'paidAt'])
@Index(['bookingId', 'status'])
@Index(['invoiceId', 'status'])
@Index(['deliverableId', 'status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'enum', enum: PaymentPurpose })
  purpose: PaymentPurpose;

  @Column({ type: 'uuid', nullable: true })
  bookingId: string | null;

  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  deliverableId: string | null;

  /** Who paid (client). Null for walk-ins paid at the desk. */
  @Column({ type: 'uuid', nullable: true })
  payerId: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  /** Mobile money number charged. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** Provider transaction id (pawaPay depositId). */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  transactionReference: string | null;

  @Column({ type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  /** Staff member who recorded a manual payment. */
  @Column({ type: 'uuid', nullable: true })
  recordedById: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Booking, (booking) => booking.payments, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking | null;
}
