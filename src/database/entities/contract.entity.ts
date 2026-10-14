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
import { ContractStatus } from '../enums';
import { Project } from './project.entity';

export interface SplitContributor {
  id: string;
  name: string;
  email: string;
  role: string;
  masterShare: number;
  publishingShare: number;
  proAffiliation?: string;
  ipiNumber?: string;
  signedAt?: string;
  signatureData?: string;
}

@Entity('contracts')
@Index(['studioId', 'projectId'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 200 })
  trackTitle: string;

  @Column({ type: 'varchar', length: 50, default: 'SPLIT_SHEET' })
  type: string;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING_SIGNATURES,
  })
  status: ContractStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  splits: SplitContributor[];

  @Column({ type: 'text', nullable: true })
  terms: string | null;

  @Column({ type: 'text', nullable: true })
  clientSignature: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  clientSignedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  staffSignature: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  staffSignedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
