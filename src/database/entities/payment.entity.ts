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
import { PaymentMethod, PaymentStatus } from '../enums';
import { Booking } from './booking.entity';

const decimalTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v === null ? null : parseFloat(v)),
};

@Entity('payments')
@Index(['status'])
@Index(['paymentMethod'])
@Index(['bookingId', 'status']) // "is this booking settled?" fast lookup
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  bookingId: string;

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

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  /**
   * Unique reference returned by the payment gateway (MoMo, Stripe, etc.).
   * Enforced UNIQUE in the DB; null while the gateway has not yet responded.
   */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  transactionReference: string | null;

  /**
   * Raw JSON payload from the gateway, preserved verbatim for reconciliation
   * and dispute resolution without re-calling the gateway API.
   */
  @Column({ type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, unknown> | null;

  /** Set when status transitions to SUCCESS. Drives revenue time-series. */
  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  paidAt: Date | null;

  /** Human-readable decline reason from the gateway on FAILED status. */
  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────
  @ManyToOne(() => Booking, (booking) => booking.payments, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
}
