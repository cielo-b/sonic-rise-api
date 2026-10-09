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
import { User } from './user.entity';

/** What happened in a session or on a project: takes, settings, to-dos. */
@Entity('session_notes')
@Index(['projectId', 'createdAt'])
@Index(['bookingId'])
export class SessionNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  bookingId: string | null;

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'text' })
  body: string;

  /** Shown to the client in their portal; otherwise team-only. */
  @Column({ type: 'boolean', default: false })
  visibleToClient: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
