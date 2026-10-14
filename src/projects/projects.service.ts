import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import {
  Booking,
  Contract,
  Deliverable,
  DeliverableComment,
  DeliverableVersion,
  Project,
  SessionNote,
  Studio,
  User,
} from '../database/entities';
import {
  ContractStatus,
  DeliverableStatus,
  Role,
  STAFF_ROLES,
} from '../database/enums';
import { hasPermission, Permission } from '../common/permissions';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { EventsService } from '../events/events.service';
import {
  CommentDto,
  CreateContractDto,
  CreateDeliverableDto,
  CreateNoteDto,
  CreateProjectDto,
  SignContractDto,
  UpdateDeliverableDto,
  UpdateProjectDto,
} from './dto';

/** File types a deliverable can be. */
export const DELIVERABLE_MIME =
  /^(audio|video|image)\/|^application\/(zip|x-zip-compressed|pdf|octet-stream)$/;

const safeUser = (u: User | null | undefined) =>
  u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: u.role } : null;

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(SessionNote)
    private readonly notes: Repository<SessionNote>,
    @InjectRepository(Deliverable)
    private readonly deliverables: Repository<Deliverable>,
    @InjectRepository(DeliverableVersion)
    private readonly versions: Repository<DeliverableVersion>,
    @InjectRepository(DeliverableComment)
    private readonly comments: Repository<DeliverableComment>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly events: EventsService,
  ) {}

  private isStaff(u: User) {
    return u.role === Role.PLATFORM_ADMIN || STAFF_ROLES.includes(u.role);
  }

  private need(u: User, p: Permission) {
    if (!hasPermission(u.role, p)) throw new ForbiddenException();
  }

  /** A project the viewer may see (clients: only their own). */
  private async access(
    studioId: string,
    id: string,
    viewer: User,
  ): Promise<Project> {
    const p = await this.projects.findOne({
      where: { id, studioId },
      relations: { client: true, lead: true },
    });
    if (!p) throw new NotFoundException('Project not found');
    if (this.isStaff(viewer)) this.need(viewer, Permission.PROJECTS_READ);
    else if (p.clientId !== viewer.id)
      throw new NotFoundException('Project not found');
    return p;
  }

  private projectView(p: Project) {
    return { ...p, client: safeUser(p.client), lead: safeUser(p.lead) };
  }

  // ─── Projects ──────────────────────────────────────────────────────────────
  async list(studioId: string, viewer: User, includeArchived: boolean) {
    if (this.isStaff(viewer)) this.need(viewer, Permission.PROJECTS_READ);
    const rows = await this.projects.find({
      where: {
        studioId,
        ...(this.isStaff(viewer) ? {} : { clientId: viewer.id }),
        ...(includeArchived ? {} : { isArchived: false }),
      },
      relations: { client: true, lead: true },
      order: { updatedAt: 'DESC' },
    });
    const counts = rows.length
      ? await this.deliverables
          .createQueryBuilder('d')
          .select('d.projectId', 'projectId')
          .addSelect('COUNT(*)', 'total')
          .addSelect(
            `SUM(CASE WHEN d.status = 'IN_REVIEW' THEN 1 ELSE 0 END)`,
            'inReview',
          )
          .where('d.projectId IN (:...ids)', { ids: rows.map((r) => r.id) })
          .groupBy('d.projectId')
          .getRawMany<{ projectId: string; total: string; inReview: string }>()
      : [];
    const byId = new Map(counts.map((c) => [c.projectId, c]));
    return rows.map((p) => ({
      ...this.projectView(p),
      deliverableCount: Number(byId.get(p.id)?.total ?? 0),
      inReviewCount: Number(byId.get(p.id)?.inReview ?? 0),
    }));
  }

  async get(studioId: string, id: string, viewer: User) {
    const p = await this.access(studioId, id, viewer);
    const [deliverables, bookings, notes] = await Promise.all([
      this.deliverables.find({
        where: { projectId: id },
        order: { createdAt: 'DESC' },
      }),
      this.bookings.find({
        where: { projectId: id, studioId },
        relations: { package: true, room: true, engineer: true },
        order: { startsAt: 'DESC' },
      }),
      this.listNotes(studioId, id, viewer),
    ]);
    return {
      ...this.projectView(p),
      deliverables,
      sessions: bookings.map((b) => ({
        id: b.id,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
        package: { id: b.package.id, name: b.package.name },
        room: { id: b.room.id, name: b.room.name },
        engineer: safeUser(b.engineer),
      })),
      notes,
    };
  }

  private async checkPeople(
    studioId: string,
    clientId?: string,
    leadId?: string | null,
  ) {
    if (
      clientId &&
      !(await this.users.exists({
        where: { id: clientId, studioId, role: Role.CLIENT },
      }))
    ) {
      throw new BadRequestException('Client not found');
    }
    if (
      leadId &&
      !(await this.users.exists({
        where: { id: leadId, studioId, role: In([...STAFF_ROLES]) },
      }))
    ) {
      throw new BadRequestException('Team member not found');
    }
  }

  async create(studioId: string, staff: User, dto: CreateProjectDto) {
    this.need(staff, Permission.PROJECTS_WRITE);
    await this.checkPeople(studioId, dto.clientId, dto.leadId);
    const p = await this.projects.save(
      this.projects.create({
        ...dto,
        studioId,
        dueDate: dto.dueDate?.slice(0, 10) ?? null,
      }),
    );
    return this.get(studioId, p.id, staff);
  }

  async update(
    studioId: string,
    id: string,
    staff: User,
    dto: UpdateProjectDto,
  ) {
    this.need(staff, Permission.PROJECTS_WRITE);
    const p = await this.access(studioId, id, staff);
    await this.checkPeople(studioId, dto.clientId, dto.leadId);
    Object.assign(p, {
      ...dto,
      ...(dto.dueDate !== undefined && {
        dueDate: dto.dueDate?.slice(0, 10) ?? null,
      }),
    });
    delete (p as Partial<Project>).client;
    delete (p as Partial<Project>).lead;
    await this.projects.save(p);
    return this.get(studioId, id, staff);
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────
  async listNotes(studioId: string, projectId: string, viewer: User) {
    const rows = await this.notes.find({
      where: {
        studioId,
        projectId,
        ...(this.isStaff(viewer) ? {} : { visibleToClient: true }),
      },
      relations: { author: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((n) => ({ ...n, author: safeUser(n.author) }));
  }

  async addNote(
    studioId: string,
    projectId: string,
    staff: User,
    dto: CreateNoteDto,
  ) {
    this.need(staff, Permission.PROJECTS_WRITE);
    await this.access(studioId, projectId, staff);
    if (
      dto.bookingId &&
      !(await this.bookings.exists({ where: { id: dto.bookingId, studioId } }))
    ) {
      throw new BadRequestException('Session not found');
    }
    await this.notes.save(
      this.notes.create({
        studioId,
        projectId,
        bookingId: dto.bookingId ?? null,
        authorId: staff.id,
        body: dto.body,
        visibleToClient: dto.visibleToClient ?? false,
      }),
    );
    return this.listNotes(studioId, projectId, staff);
  }

  async deleteNote(studioId: string, noteId: string, staff: User) {
    const n = await this.notes.findOne({ where: { id: noteId, studioId } });
    if (!n) throw new NotFoundException('Note not found');
    if (
      n.authorId !== staff.id &&
      !hasPermission(staff.role, Permission.STAFF_MANAGE)
    ) {
      throw new ForbiddenException(
        'Only the author or a manager can delete this note',
      );
    }
    await this.notes.remove(n);
  }

  // ─── Deliverables ──────────────────────────────────────────────────────────
  private async deliverableAccess(studioId: string, id: string, viewer: User) {
    const d = await this.deliverables.findOne({ where: { id, studioId } });
    if (!d) throw new NotFoundException('File not found');
    const project = await this.access(studioId, d.projectId, viewer);
    return { d, project };
  }

  async createDeliverable(
    studioId: string,
    projectId: string,
    staff: User,
    dto: CreateDeliverableDto,
  ) {
    this.need(staff, Permission.DELIVERABLES_UPLOAD);
    await this.access(studioId, projectId, staff);
    const studio = await this.studios.findOneOrFail({
      where: { id: studioId },
    });
    const d = await this.deliverables.save(
      this.deliverables.create({
        studioId,
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        price: Math.round(dto.price ?? 0),
        currency: studio.currency,
      }),
    );
    return this.getDeliverable(studioId, d.id, staff);
  }

  async updateDeliverable(
    studioId: string,
    id: string,
    staff: User,
    dto: UpdateDeliverableDto,
  ) {
    this.need(staff, Permission.DELIVERABLES_UPLOAD);
    const { d } = await this.deliverableAccess(studioId, id, staff);
    if (dto.price !== undefined && d.isPaid)
      throw new BadRequestException('This file is already paid for');
    Object.assign(d, {
      ...dto,
      ...(dto.price !== undefined && { price: Math.round(dto.price) }),
    });
    await this.deliverables.save(d);
    return this.getDeliverable(studioId, id, staff);
  }

  async removeDeliverable(studioId: string, id: string, staff: User) {
    this.need(staff, Permission.DELIVERABLES_UPLOAD);
    const { d } = await this.deliverableAccess(studioId, id, staff);
    if (d.isPaid) throw new BadRequestException('Paid files cannot be deleted');
    const versions = await this.versions.find({ where: { deliverableId: id } });
    await this.deliverables.remove(d);
    await Promise.all(
      versions.map((v) => this.storage.removePrivate(v.fileKey)),
    );
  }

  async getDeliverable(studioId: string, id: string, viewer: User) {
    const { d, project } = await this.deliverableAccess(studioId, id, viewer);
    const [versions, comments] = await Promise.all([
      this.versions.find({
        where: { deliverableId: id },
        relations: { uploadedBy: true },
        order: { version: 'DESC' },
      }),
      this.comments.find({
        where: { deliverableId: id },
        relations: { author: true },
        order: { createdAt: 'ASC' },
      }),
    ]);
    return {
      ...d,
      project: {
        id: project.id,
        title: project.title,
        clientId: project.clientId,
      },
      canDownload:
        d.status === DeliverableStatus.APPROVED &&
        (d.price <= 0 || d.isPaid) &&
        versions.length > 0,
      versions: versions.map((v) => ({
        ...v,
        uploadedBy: safeUser(v.uploadedBy),
      })),
      comments: comments.map((c) => ({ ...c, author: safeUser(c.author) })),
    };
  }

  async uploadVersion(
    studioId: string,
    id: string,
    staff: User,
    file: Express.Multer.File,
    note?: string,
  ) {
    try {
      this.need(staff, Permission.DELIVERABLES_UPLOAD);
      if (!file) throw new BadRequestException('No file attached');
      if (!DELIVERABLE_MIME.test(file.mimetype))
        throw new BadRequestException(
          `File type not allowed: ${file.mimetype}`,
        );
      const { d, project } = await this.deliverableAccess(studioId, id, staff);
      if (d.isPaid && d.status === DeliverableStatus.APPROVED) {
        throw new BadRequestException(
          'This file is approved and paid — create a new deliverable for changes',
        );
      }
      const key = await this.storage.uploadPrivateFile(
        file.path,
        file.originalname,
        file.mimetype,
        `${studioId}/deliverables/${d.id}`,
      );
      const version = d.latestVersion + 1;
      await this.versions.save(
        this.versions.create({
          deliverableId: d.id,
          version,
          fileKey: key,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: String(file.size),
          note: note ?? null,
          uploadedById: staff.id,
        }),
      );
      // A new version always goes back to the client for review.
      await this.deliverables.update(d.id, {
        latestVersion: version,
        status: DeliverableStatus.IN_REVIEW,
        approvedAt: null,
      });

      const studio = await this.studios.findOneOrFail({
        where: { id: studioId },
      });
      const client = project.client;
      if (client) {
        void this.mail.sendDeliverableReady(
          studio,
          client.email,
          client.name,
          project.title,
          d.title,
          version,
          `${this.mail.siteUrl(studio)}/portal/files/${d.id}`,
        );
      }
      return this.getDeliverable(studioId, id, staff);
    } finally {
      if (file?.path) await unlink(file.path).catch(() => undefined);
    }
  }

  /** Inline link for listening/watching while reviewing. Includes signed links for stems if present. */
  async streamUrl(
    studioId: string,
    id: string,
    versionId: string,
    viewer: User,
  ) {
    await this.deliverableAccess(studioId, id, viewer);
    const v = await this.versions.findOne({
      where: { id: versionId, deliverableId: id },
    });
    if (!v) throw new NotFoundException('Version not found');
    const url = await this.storage.privateUrl(v.fileKey, v.fileName, {
      download: false,
    });
    const stems = await Promise.all(
      (v.stems ?? []).map(async (s) => ({
        ...s,
        url: await this.storage.privateUrl(s.fileKey, s.fileName, {
          download: false,
        }),
      })),
    );
    return { url, stems };
  }

  /** Download of the latest version: approved, and paid when it has a price. Staff can always download. */
  async downloadUrl(studioId: string, id: string, viewer: User) {
    const { d } = await this.deliverableAccess(studioId, id, viewer);
    if (!this.isStaff(viewer)) {
      if (d.status !== DeliverableStatus.APPROVED)
        throw new ForbiddenException('Approve the file to download it');
      if (d.price > 0 && !d.isPaid)
        throw new ForbiddenException('Pay for this file to download it');
    }
    const v = await this.versions.findOne({
      where: { deliverableId: id, version: d.latestVersion },
    });
    if (!v) throw new NotFoundException('No file uploaded yet');
    return {
      url: await this.storage.privateUrl(v.fileKey, v.fileName, {
        download: true,
      }),
    };
  }

  async comment(studioId: string, id: string, viewer: User, dto: CommentDto) {
    await this.deliverableAccess(studioId, id, viewer);
    if (
      dto.versionId &&
      !(await this.versions.exists({
        where: { id: dto.versionId, deliverableId: id },
      }))
    ) {
      throw new BadRequestException('Version not found');
    }
    await this.comments.save(
      this.comments.create({
        deliverableId: id,
        versionId: dto.versionId ?? null,
        authorId: viewer.id,
        body: dto.body,
        atSeconds: dto.atSeconds ?? null,
      }),
    );
    return this.getDeliverable(studioId, id, viewer);
  }

  async resolveComment(
    studioId: string,
    id: string,
    commentId: string,
    staff: User,
    resolved: boolean,
  ) {
    this.need(staff, Permission.PROJECTS_WRITE);
    await this.deliverableAccess(studioId, id, staff);
    await this.comments.update(
      { id: commentId, deliverableId: id },
      { resolved },
    );
    return this.getDeliverable(studioId, id, staff);
  }

  /** Client approves the latest version. */
  async approve(studioId: string, id: string, client: User) {
    const { d, project } = await this.deliverableAccess(studioId, id, client);
    if (project.clientId !== client.id)
      throw new ForbiddenException('Only the client can approve');
    if (d.latestVersion === 0)
      throw new BadRequestException('Nothing to approve yet');
    await this.deliverables.update(d.id, {
      status: DeliverableStatus.APPROVED,
      approvedAt: new Date(),
    });
    return this.getDeliverable(studioId, id, client);
  }

  async requestChanges(
    studioId: string,
    id: string,
    client: User,
    body: string,
  ) {
    const { d, project } = await this.deliverableAccess(studioId, id, client);
    if (project.clientId !== client.id)
      throw new ForbiddenException('Only the client can request changes');
    const latest = await this.versions.findOne({
      where: { deliverableId: id, version: d.latestVersion },
    });
    await this.comments.save(
      this.comments.create({
        deliverableId: id,
        versionId: latest?.id ?? null,
        authorId: client.id,
        body,
      }),
    );
    await this.deliverables.update(d.id, {
      status: DeliverableStatus.CHANGES_REQUESTED,
      approvedAt: null,
    });
    this.events.emit(studioId, 'deliverable.changes_requested', {
      deliverableId: id,
    });
    return this.getDeliverable(studioId, id, client);
  }

  // ─── Stems ─────────────────────────────────────────────────────────────────
  async uploadStem(
    studioId: string,
    id: string,
    versionId: string,
    staff: User,
    file: Express.Multer.File,
    name: string,
  ) {
    try {
      this.need(staff, Permission.DELIVERABLES_UPLOAD);
      if (!file) throw new BadRequestException('No file attached');
      const { d } = await this.deliverableAccess(studioId, id, staff);
      const v = await this.versions.findOne({
        where: { id: versionId, deliverableId: id },
      });
      if (!v) throw new NotFoundException('Version not found');
      const key = await this.storage.uploadPrivateFile(
        file.path,
        file.originalname,
        file.mimetype,
        `${studioId}/deliverables/${d.id}/stems`,
      );
      const stem = {
        id: randomUUID(),
        name: name.trim() || file.originalname,
        fileKey: key,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
      };
      v.stems = [...(v.stems ?? []), stem];
      await this.versions.save(v);
      this.events.emit(studioId, 'deliverable.stem_uploaded', {
        deliverableId: id,
        versionId,
      });
      return this.getDeliverable(studioId, id, staff);
    } finally {
      if (file?.path) await unlink(file.path).catch(() => undefined);
    }
  }

  async deleteStem(
    studioId: string,
    id: string,
    versionId: string,
    stemId: string,
    staff: User,
  ) {
    this.need(staff, Permission.DELIVERABLES_UPLOAD);
    await this.deliverableAccess(studioId, id, staff);
    const v = await this.versions.findOne({
      where: { id: versionId, deliverableId: id },
    });
    if (!v) throw new NotFoundException('Version not found');
    const stem = (v.stems ?? []).find((s) => s.id === stemId);
    if (stem) {
      await this.storage.removePrivate(stem.fileKey);
      v.stems = (v.stems ?? []).filter((s) => s.id !== stemId);
      await this.versions.save(v);
      this.events.emit(studioId, 'deliverable.stem_deleted', {
        deliverableId: id,
        versionId,
      });
    }
    return this.getDeliverable(studioId, id, staff);
  }

  // ─── Contracts & Split Sheets ──────────────────────────────────────────────
  async listContracts(studioId: string, projectId: string, viewer: User) {
    await this.access(studioId, projectId, viewer);
    return this.contracts.find({
      where: { studioId, projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async getContract(studioId: string, id: string, viewer: User) {
    const c = await this.contracts.findOne({ where: { id, studioId } });
    if (!c) throw new NotFoundException('Contract not found');
    await this.access(studioId, c.projectId, viewer);
    return c;
  }

  async createContract(
    studioId: string,
    projectId: string,
    staff: User,
    dto: CreateContractDto,
  ) {
    this.need(staff, Permission.PROJECTS_WRITE);
    await this.access(studioId, projectId, staff);
    const splits = (dto.splits ?? []).map((s) => ({
      ...s,
      id: randomUUID(),
    }));
    const contract = await this.contracts.save(
      this.contracts.create({
        studioId,
        projectId,
        title: dto.title.trim(),
        trackTitle: dto.trackTitle.trim(),
        type: dto.type?.trim() || 'SPLIT_SHEET',
        splits,
        terms: dto.terms?.trim() || null,
        status: ContractStatus.PENDING_SIGNATURES,
      }),
    );
    this.events.emit(studioId, 'contract.created', {
      id: contract.id,
      projectId,
    });
    return contract;
  }

  async signContract(
    studioId: string,
    id: string,
    user: User,
    dto: SignContractDto,
  ) {
    const c = await this.contracts.findOne({ where: { id, studioId } });
    if (!c) throw new NotFoundException('Contract not found');
    await this.access(studioId, c.projectId, user);

    const now = new Date();
    if (this.isStaff(user)) {
      c.staffSignature = dto.signatureData;
      c.staffSignedAt = now;
    } else {
      c.clientSignature = dto.signatureData;
      c.clientSignedAt = now;
    }

    if (dto.contributorEmail) {
      c.splits = (c.splits ?? []).map((s) =>
        s.email.toLowerCase() === dto.contributorEmail?.toLowerCase()
          ? {
              ...s,
              signedAt: now.toISOString(),
              signatureData: dto.signatureData,
            }
          : s,
      );
    }

    const allSplitsSigned =
      (c.splits ?? []).length > 0 &&
      (c.splits ?? []).every((s) => !!s.signedAt);
    if ((allSplitsSigned || c.clientSignedAt) && c.staffSignedAt) {
      c.status = ContractStatus.SIGNED;
    }

    await this.contracts.save(c);
    this.events.emit(studioId, 'contract.signed', {
      id: c.id,
      projectId: c.projectId,
    });
    return c;
  }

  async deleteContract(studioId: string, id: string, staff: User) {
    this.need(staff, Permission.PROJECTS_WRITE);
    const c = await this.contracts.findOne({ where: { id, studioId } });
    if (!c) throw new NotFoundException('Contract not found');
    await this.contracts.remove(c);
  }
}
