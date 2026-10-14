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
import { DeliverableStatus } from '../enums';
import { User } from './user.entity';
import { decimalTransformer } from './transformers';

/**
 * A file the client receives (mix, master, stems, edit…). Each upload is a
 * new version; the client reviews, comments and approves. Downloads require
 * approval and, when price > 0, a successful payment.
 */
@Entity('deliverables')
@Index(['projectId', 'createdAt'])
export class Deliverable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: DeliverableStatus,
    default: DeliverableStatus.IN_REVIEW,
  })
  status: DeliverableStatus;

  /** Price to download the final file (0 = free). */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  latestVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DeliverableVersion, (v) => v.deliverable)
  versions: DeliverableVersion[];
}

@Entity('deliverable_versions')
@Index(['deliverableId', 'version'], { unique: true })
export class DeliverableVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deliverableId: string;

  @ManyToOne(() => Deliverable, (d) => d.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliverableId' })
  deliverable: Deliverable;

  @Column({ type: 'integer' })
  version: number;

  /** Object key in the private deliverables bucket. */
  @Column({ type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  stems: Array<{
    id: string;
    name: string;
    fileKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: string;
  }>;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('deliverable_comments')
@Index(['deliverableId', 'createdAt'])
export class DeliverableComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deliverableId: string;

  @Column({ type: 'uuid', nullable: true })
  versionId: string | null;

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'text' })
  body: string;

  /** Position in the audio/video the comment refers to, in seconds. */
  @Column({ type: 'integer', nullable: true })
  atSeconds: number | null;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
