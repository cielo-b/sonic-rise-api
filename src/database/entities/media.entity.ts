import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** The studio's asset library (website images, reels, raw footage…), organised in folders. */
@Entity('media')
@Index(['studioId', 'parentId'])
@Index(['studioId', 'isTrash'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** image | video | audio | folder */
  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType: string | null;

  /** Human-readable, e.g. "12.4 MB". */
  @Column({ type: 'varchar', length: 30, nullable: true })
  size: string | null;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

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

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
