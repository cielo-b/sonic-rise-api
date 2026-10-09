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
import { ProjectStage } from '../enums';
import { User } from './user.entity';

/** A piece of work from first demo to release: a single, an EP, a music video, a podcast season… */
@Entity('projects')
@Index(['studioId', 'stage'])
@Index(['clientId'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client: User;

  /** Lead engineer / producer. */
  @Column({ type: 'uuid', nullable: true })
  leadId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead: User | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ProjectStage, default: ProjectStage.DEMO })
  stage: ProjectStage;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
