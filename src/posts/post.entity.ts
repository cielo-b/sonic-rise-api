import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('posts')
@Index(['studioId', 'slug'], { unique: true })
@Index(['studioId', 'published', 'createdAt'])
@Index(['published', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  excerpt: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  coverUrl: string | null;

  @Column({ type: 'varchar', length: 20 })
  readTime: string;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @Column({ type: 'varchar', length: 255 })
  authorName: string;

  @Column({ type: 'varchar', length: 2, default: '' })
  authorInitials: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
