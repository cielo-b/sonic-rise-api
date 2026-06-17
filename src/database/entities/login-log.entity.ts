import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('login_logs')
@Index(['userId'])
@Index(['createdAt'])
export class LoginLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** 'success' | 'failed' */
  @Column({ type: 'varchar', length: 20 })
  status: 'success' | 'failed';

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  /** Friendly device label derived from userAgent */
  @Column({ type: 'varchar', length: 120, nullable: true })
  device: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
