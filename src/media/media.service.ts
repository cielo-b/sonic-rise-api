import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../database/entities';
import { StorageService } from '../storage/storage.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private readonly repo: Repository<Media>,
    private readonly storage: StorageService,
  ) {}

  findAll(studioId: string) {
    return this.repo.find({
      where: { studioId },
      order: { isFolder: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(studioId: string, id: string) {
    const item = await this.repo.findOne({ where: { id, studioId } });
    if (!item) throw new NotFoundException('Media asset not found');
    return item;
  }

  private async checkParent(studioId: string, parentId?: string | null) {
    if (!parentId) return;
    const parent = await this.repo.findOne({
      where: { id: parentId, studioId },
    });
    if (!parent?.isFolder) throw new BadRequestException('Folder not found');
  }

  async create(studioId: string, userId: string, dto: CreateMediaDto) {
    await this.checkParent(studioId, dto.parentId);
    const isFolder = dto.type === 'folder' || !!dto.isFolder;
    return this.repo.save(
      this.repo.create({
        ...dto,
        isFolder,
        type: isFolder ? 'folder' : dto.type,
        studioId,
        uploadedById: userId,
      }),
    );
  }

  async update(studioId: string, id: string, dto: UpdateMediaDto) {
    const item = await this.findOne(studioId, id);
    if (dto.parentId === id)
      throw new BadRequestException('A folder cannot contain itself');
    await this.checkParent(studioId, dto.parentId);
    return this.repo.save(Object.assign(item, dto));
  }

  /** Deletes permanently, including the stored file. Folders must be empty. */
  async remove(studioId: string, id: string) {
    const item = await this.findOne(studioId, id);
    if (
      item.isFolder &&
      (await this.repo.exists({ where: { studioId, parentId: id } }))
    ) {
      throw new BadRequestException('Empty the folder first');
    }
    await this.repo.remove(item);
    if (item.url) await this.storage.delete(item.url);
  }
}
