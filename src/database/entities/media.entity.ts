import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'video' | 'audio' | 'image'

  @Column({ type: 'varchar', length: 50 })
  badge: string;

  @Column({ type: 'varchar', length: 50 })
  badgeColor: string;

  @Column({ type: 'varchar', length: 50 })
  size: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  duration: string | null;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 255 })
  statusColor: string;

  @Column({ type: 'varchar', nullable: true })
  src: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution: string | null;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'boolean', default: false })
  isFolder: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({ type: 'boolean', default: false })
  isTrash: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;
}
