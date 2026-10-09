import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** A bookable space: recording room, control room, video stage, podcast booth… */
@Entity('rooms')
@Index(['studioId', 'isActive'])
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', nullable: true })
  capacity: number | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** Calendar colour in the admin panel. */
  @Column({ type: 'varchar', length: 9, default: '#7C3AED' })
  color: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
