import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Post } from './post.entity';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

/** ~200 words per minute, at least 1 minute. */
function readTime(content: string, excerpt: string): string {
  const words = `${excerpt} ${content}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export class CreatePostDto {
  @IsString() @MaxLength(255) title: string;
  @IsString() @MaxLength(100) category: string;
  @IsString() @MaxLength(1000) excerpt: string;
  @IsOptional() @IsString() @MaxLength(100000) content?: string;
  @IsOptional()
  @IsUrl({
    require_tld: false,
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  coverUrl?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() published?: boolean;
  @IsString() @MaxLength(255) authorName: string;
  @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
}
export class UpdatePostDto extends PartialType(CreatePostDto) {}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly repo: Repository<Post>,
  ) {}

  findAll(studioId: string, publishedOnly: boolean) {
    return this.repo.find({
      where: { studioId, ...(publishedOnly ? { published: true } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySlug(studioId: string, slug: string) {
    const post = await this.repo.findOne({
      where: { studioId, slug, published: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private async uniqueSlug(
    studioId: string,
    wanted: string,
    exceptId?: string,
  ) {
    const clash = await this.repo.findOne({
      where: { studioId, slug: wanted },
    });
    if (clash && clash.id !== exceptId)
      throw new ConflictException(
        `The address "${wanted}" is already used by another post`,
      );
    return wanted;
  }

  async create(studioId: string, dto: CreatePostDto) {
    const slug = await this.uniqueSlug(studioId, dto.slug ?? toSlug(dto.title));
    const content = dto.content ?? '';
    return this.repo.save(
      this.repo.create({
        ...dto,
        studioId,
        slug,
        content,
        authorInitials: initials(dto.authorName),
        readTime: readTime(content, dto.excerpt),
      }),
    );
  }

  async update(studioId: string, id: string, dto: UpdatePostDto) {
    const post = await this.repo.findOne({ where: { id, studioId } });
    if (!post) throw new NotFoundException('Post not found');
    if (dto.slug && dto.slug !== post.slug)
      await this.uniqueSlug(studioId, dto.slug, id);
    Object.assign(post, dto);
    if (dto.authorName) post.authorInitials = initials(dto.authorName);
    post.readTime = readTime(post.content, post.excerpt);
    return this.repo.save(post);
  }

  async remove(studioId: string, id: string) {
    const post = await this.repo.findOne({ where: { id, studioId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.repo.remove(post);
  }
}
