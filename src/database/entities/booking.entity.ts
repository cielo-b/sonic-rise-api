import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingStatus, ServiceType } from '../enums';
import { User } from './user.entity';
import { Payment } from './payment.entity';

/** Reusable transformer: stores Decimal as numeric in PG, returns JS number. */
const decimalTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v === null ? null : parseFloat(v)),
};

@Entity('bookings')
@Index(['status'])
@Index(['dateTime'])
@Index(['serviceType'])
@Index(['clientId', 'status']) // "my active bookings" client-dashboard query
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK stored explicitly for direct queries without JOIN. */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  clientId: string | null;

  @Column({ type: 'varchar', nullable: true })
  guestName: string | null;

  @Column({ type: 'varchar', nullable: true })
  guestEmail: string | null;

  @Column({ type: 'enum', enum: ServiceType })
  serviceType: ServiceType;

  /** UTC timestamp of session start. */
  @Column({ type: 'timestamptz' })
  dateTime: Date;

  /**
   * UTC timestamp of expected session end.
   * Computed at booking time from serviceType duration and stored
   * to keep calendar availability queries simple and fast.
   */
  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  /**
   * Agreed total in `currency`. Using DECIMAL(12,2) to avoid IEEE-754
   * floating-point errors on financial values.
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  /** Client-visible session notes supplied during booking. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Internal staff notes — never exposed to the client API. */
  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────
  @ManyToOne(() => User, (user) => user.bookings, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'clientId' })
  client: User | null;

  @OneToMany(() => Payment, (payment) => payment.booking, { lazy: true })
  payments: Promise<Payment[]>;
}
