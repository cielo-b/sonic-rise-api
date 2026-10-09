import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** A contact-form message, kept so the team can follow up from the panel. */
@Entity('inquiries')
@Index(['studioId', 'createdAt'])
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  isHandled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

/** Newsletter sign-up with the consent it was given under. */
@Entity('subscribers')
@Index(['studioId', 'email'], { unique: true })
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'timestamptz' })
  consentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  unsubscribedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
