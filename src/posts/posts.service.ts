import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsString()
  excerpt: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;

  @IsString()
  @IsOptional()
  readTime?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsString()
  authorName: string;

  @IsString()
  @IsOptional()
  authorInitials?: string;

  @IsString()
  @IsOptional()
  slug?: string;
}

import { PartialType } from '@nestjs/swagger';
export class UpdatePostDto extends PartialType(CreatePostDto) {}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly repo: Repository<Post>,
  ) {}

  findAll(publishedOnly = true): Promise<Post[]> {
    return this.repo.find({
      where: publishedOnly ? { published: true } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.repo.findOne({ where: { slug } });
    if (!post) throw new NotFoundException(`Post "${slug}" not found`);
    return post;
  }

  async create(dto: CreatePostDto): Promise<Post> {
    const slug = dto.slug ?? toSlug(dto.title);
    const exists = await this.repo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`Slug "${slug}" already in use`);

    const post = this.repo.create({
      ...dto,
      slug,
      authorInitials:
        dto.authorInitials ??
        dto.authorName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      content: dto.content ?? '',
      readTime: dto.readTime ?? '5 min',
    });
    return this.repo.save(post);
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    Object.assign(post, dto);
    return this.repo.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    await this.repo.remove(post);
  }
}
