import { PostsService, CreatePostDto, UpdatePostDto } from './posts.service';
export declare class PostsController {
    private readonly svc;
    constructor(svc: PostsService);
    findAll(all?: string): Promise<import("./post.entity").Post[]>;
    findOne(slug: string): Promise<import("./post.entity").Post>;
    create(dto: CreatePostDto): Promise<import("./post.entity").Post>;
    update(id: string, dto: UpdatePostDto): Promise<import("./post.entity").Post>;
    remove(id: string): Promise<void>;
}
