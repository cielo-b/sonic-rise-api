"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = exports.UpdatePostDto = exports.CreatePostDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_entity_1 = require("./post.entity");
function toSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
const class_validator_1 = require("class-validator");
class CreatePostDto {
    title;
    category;
    excerpt;
    content;
    coverUrl;
    readTime;
    featured;
    published;
    authorName;
    authorInitials;
    slug;
}
exports.CreatePostDto = CreatePostDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "excerpt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "coverUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "readTime", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreatePostDto.prototype, "featured", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreatePostDto.prototype, "published", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "authorName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "authorInitials", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "slug", void 0);
const swagger_1 = require("@nestjs/swagger");
class UpdatePostDto extends (0, swagger_1.PartialType)(CreatePostDto) {
}
exports.UpdatePostDto = UpdatePostDto;
let PostsService = class PostsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll(publishedOnly = true) {
        return this.repo.find({
            where: publishedOnly ? { published: true } : {},
            order: { createdAt: 'DESC' },
        });
    }
    async findBySlug(slug) {
        const post = await this.repo.findOne({ where: { slug } });
        if (!post)
            throw new common_1.NotFoundException(`Post "${slug}" not found`);
        return post;
    }
    async create(dto) {
        const slug = dto.slug ?? toSlug(dto.title);
        const exists = await this.repo.findOne({ where: { slug } });
        if (exists)
            throw new common_1.ConflictException(`Slug "${slug}" already in use`);
        const post = this.repo.create({
            ...dto,
            slug,
            authorInitials: dto.authorInitials ?? dto.authorName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
            content: dto.content ?? '',
            readTime: dto.readTime ?? '5 min',
        });
        return this.repo.save(post);
    }
    async update(id, dto) {
        const post = await this.repo.findOne({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException(`Post ${id} not found`);
        Object.assign(post, dto);
        return this.repo.save(post);
    }
    async remove(id) {
        const post = await this.repo.findOne({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException(`Post ${id} not found`);
        await this.repo.remove(post);
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PostsService);
//# sourceMappingURL=posts.service.js.map