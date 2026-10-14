import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Booking,
  Equipment,
  Room,
  ServicePackage,
  User,
} from '../database/entities';
import { STAFF_ROLES } from '../database/enums';
import { randomUUID } from 'crypto';
import {
  AddMaintenanceLogDto,
  CreateEquipmentDto,
  CreatePackageDto,
  CreateRoomDto,
  UpdateEquipmentDto,
  UpdatePackageDto,
  UpdateRoomDto,
} from './dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Equipment)
    private readonly equipment: Repository<Equipment>,
    @InjectRepository(ServicePackage)
    private readonly packages: Repository<ServicePackage>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
  ) {}

  // ─── Rooms ─────────────────────────────────────────────────────────────────
  listRooms(studioId: string, activeOnly: boolean) {
    return this.rooms.find({
      where: { studioId, ...(activeOnly ? { isActive: true } : {}) },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getRoom(studioId: string, id: string) {
    const room = await this.rooms.findOne({ where: { id, studioId } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  createRoom(studioId: string, dto: CreateRoomDto) {
    return this.rooms.save(this.rooms.create({ ...dto, studioId }));
  }

  async updateRoom(studioId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.getRoom(studioId, id);
    return this.rooms.save(Object.assign(room, dto));
  }

  /** Rooms with booking history are deactivated instead of deleted. */
  async removeRoom(studioId: string, id: string) {
    const room = await this.getRoom(studioId, id);
    if (await this.bookings.exists({ where: { roomId: id } })) {
      room.isActive = false;
      await this.rooms.save(room);
      return { deactivated: true };
    }
    await this.rooms.remove(room);
    return { deleted: true };
  }

  // ─── Equipment ─────────────────────────────────────────────────────────────
  listEquipment(studioId: string, activeOnly: boolean) {
    return this.equipment.find({
      where: { studioId, ...(activeOnly ? { isActive: true } : {}) },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getEquipment(studioId: string, id: string) {
    const item = await this.equipment.findOne({ where: { id, studioId } });
    if (!item) throw new NotFoundException('Equipment not found');
    return item;
  }

  createEquipment(studioId: string, dto: CreateEquipmentDto) {
    const barcode =
      dto.barcode?.trim() ||
      `EQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return this.equipment.save(
      this.equipment.create({ ...dto, barcode, studioId }),
    );
  }

  async updateEquipment(studioId: string, id: string, dto: UpdateEquipmentDto) {
    const item = await this.getEquipment(studioId, id);
    return this.equipment.save(Object.assign(item, dto));
  }

  async addMaintenanceLog(
    studioId: string,
    id: string,
    dto: AddMaintenanceLogDto,
  ) {
    const item = await this.getEquipment(studioId, id);
    const entry = {
      id: randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      technician: dto.technician.trim(),
      description: dto.description.trim(),
      cost: dto.cost,
    };
    item.maintenanceHistory = [entry, ...(item.maintenanceHistory ?? [])];
    item.lastMaintainedAt = new Date();
    if (dto.status) item.status = dto.status;
    return this.equipment.save(item);
  }

  async removeEquipment(studioId: string, id: string) {
    const item = await this.getEquipment(studioId, id);
    const used = await this.bookings
      .createQueryBuilder('b')
      .innerJoin('b.equipment', 'e', 'e.id = :id', { id })
      .getExists();
    if (used) {
      item.isActive = false;
      await this.equipment.save(item);
      return { deactivated: true };
    }
    await this.equipment.remove(item);
    return { deleted: true };
  }

  // ─── Packages ──────────────────────────────────────────────────────────────
  listPackages(studioId: string, publicOnly: boolean) {
    return this.packages.find({
      where: {
        studioId,
        ...(publicOnly ? { isActive: true, bookableOnline: true } : {}),
      },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getPackage(studioId: string, id: string) {
    const pkg = await this.packages.findOne({ where: { id, studioId } });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  private async checkRooms(studioId: string, roomIds?: string[]) {
    if (!roomIds?.length) return;
    const count = await this.rooms.count({
      where: { studioId, id: In(roomIds) },
    });
    if (count !== new Set(roomIds).size)
      throw new BadRequestException('Unknown room in roomIds');
  }

  async createPackage(studioId: string, dto: CreatePackageDto) {
    await this.checkRooms(studioId, dto.roomIds);
    return this.packages.save(this.packages.create({ ...dto, studioId }));
  }

  async updatePackage(studioId: string, id: string, dto: UpdatePackageDto) {
    const pkg = await this.getPackage(studioId, id);
    await this.checkRooms(studioId, dto.roomIds);
    return this.packages.save(Object.assign(pkg, dto));
  }

  async removePackage(studioId: string, id: string) {
    const pkg = await this.getPackage(studioId, id);
    if (await this.bookings.exists({ where: { packageId: id } })) {
      pkg.isActive = false;
      await this.packages.save(pkg);
      return { deactivated: true };
    }
    await this.packages.remove(pkg);
    return { deleted: true };
  }

  // ─── Engineers ─────────────────────────────────────────────────────────────
  /** Team members who can be assigned to sessions. Public fields only. */
  async listEngineers(studioId: string) {
    const engineers = await this.users.find({
      where: {
        studioId,
        isBookable: true,
        isActive: true,
        role: In([...STAFF_ROLES]),
      },
      order: { name: 'ASC' },
    });
    return engineers.map((u) => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      role: u.role,
    }));
  }
}
