import { Repository } from 'typeorm';
import { Post } from './post.entity';
export declare class CreatePostDto {
    title: string;
    category: string;
    excerpt: string;
    content?: string;
    coverUrl?: string;
    readTime?: string;
    featured?: boolean;
    published?: boolean;
    authorName: string;
    authorInitials?: string;
    slug?: string;
}
declare const UpdatePostDto_base: import("@nestjs/common").Type<Partial<CreatePostDto>>;
export declare class UpdatePostDto extends UpdatePostDto_base {
}
export declare class PostsService {
    private readonly repo;
    constructor(repo: Repository<Post>);
    findAll(publishedOnly?: boolean): Promise<Post[]>;
    findBySlug(slug: string): Promise<Post>;
    create(dto: CreatePostDto): Promise<Post>;
    update(id: string, dto: UpdatePostDto): Promise<Post>;
    remove(id: string): Promise<void>;
}
export {};
