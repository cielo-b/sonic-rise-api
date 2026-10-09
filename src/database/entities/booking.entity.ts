import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingSource, BookingStatus } from '../enums';
import { User } from './user.entity';
import { Payment } from './payment.entity';
import { Room } from './room.entity';
import { Equipment } from './equipment.entity';
import { ServicePackage } from './service-package.entity';
import { decimalTransformer } from './transformers';

/**
 * One session: a package in a room, optionally with an engineer and gear,
 * between startsAt and endsAt. Room, engineer and equipment can't overlap
 * with another active booking (enforced in BookingsService).
 */
@Entity('bookings')
@Index(['studioId', 'startsAt'])
@Index(['studioId', 'status'])
@Index(['roomId', 'startsAt'])
@Index(['engineerId', 'startsAt'])
@Index(['clientId', 'status'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  /** Walk-in clients without an account (staff-created bookings only). */
  @Column({ type: 'varchar', nullable: true })
  guestName: string | null;

  @Column({ type: 'varchar', nullable: true })
  guestEmail: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  guestPhone: string | null;

  @Column({ type: 'uuid' })
  packageId: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'uuid', nullable: true })
  engineerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: BookingSource, default: BookingSource.WEB })
  source: BookingSource;

  /** Computed server-side from the package, duration and equipment. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  depositAmount: number;

  /** Sum of successful payments for this booking. */
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

  /** From the client. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Staff only. */
  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

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

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'engineerId' })
  engineer: User | null;

  @ManyToOne(() => Room, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => ServicePackage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'packageId' })
  package: ServicePackage;

  @ManyToMany(() => Equipment)
  @JoinTable({
    name: 'booking_equipment',
    joinColumn: { name: 'bookingId' },
    inverseJoinColumn: { name: 'equipmentId' },
  })
  equipment: Equipment[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];
}
