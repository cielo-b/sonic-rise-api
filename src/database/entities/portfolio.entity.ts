import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Admin-curated public showcase of completed studio work.
 * Intentionally decoupled from the operational Booking system so marketing
 * content can be managed independently of client records.
 */
@Entity('portfolio')
@Index(['category'])
@Index(['sortOrder'])
@Index(['isFeatured', 'sortOrder']) // homepage featured-grid query
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /**
   * Free-text category (e.g. "Music Video", "Live Session").
   * String rather than enum so admins can add categories without a migration.
   */
  @Column({ type: 'varchar', length: 100 })
  category: string;

  /** URL of the primary asset (video, audio file, or image). */
  @Column({ type: 'varchar' })
  mediaUrl: string;

  /** Optional lower-resolution URL for grid/thumbnail previews. */
  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  /** Supporting copy shown on the detail view. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** When true this item appears in the homepage hero / featured carousel. */
  @Column({ type: 'boolean', default: false })
  @Index()
  isFeatured: boolean;

  /**
   * Display order within the grid. Lower value = shown first.
   * Allows admins to reorder without re-inserting rows.
   */
  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  /**
   * PostgreSQL native text array for future faceted filtering.
   * e.g. ['afrobeat', 'kigali', '2024']
   */
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
