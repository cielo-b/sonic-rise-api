import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { ProjectsService } from './projects.service';
import {
  CommentDto,
  CreateContractDto,
  CreateDeliverableDto,
  CreateNoteDto,
  CreateProjectDto,
  RequestChangesDto,
  SignContractDto,
  UpdateDeliverableDto,
  UpdateProjectDto,
  UploadStemDto,
  UploadVersionDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  StaffOnly,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudioId } from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

class ResolveDto {
  @IsBoolean() resolved: boolean;
}

/** 2 GB: stems and video masters. Files go to disk, then stream to storage. */
const MAX_DELIVERABLE = 2 * 1024 * 1024 * 1024;

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  list(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Query('archived', new ParseBoolPipe({ optional: true }))
    archived?: boolean,
  ) {
    return this.svc.list(s, u, archived ?? false);
  }

  @Get(':id')
  get(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.get(s, id, u);
  }

  @Post()
  @StaffOnly()
  create(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Body() dto: CreateProjectDto,
  ) {
    return this.svc.create(s, u, dto);
  }

  @Patch(':id')
  @StaffOnly()
  update(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.svc.update(s, id, u, dto);
  }

  @Get(':id/notes')
  notes(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.listNotes(s, id, u);
  }

  @Post(':id/notes')
  @StaffOnly()
  addNote(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.svc.addNote(s, id, u, dto);
  }

  @Post(':id/deliverables')
  @StaffOnly()
  createDeliverable(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.svc.createDeliverable(s, id, u, dto);
  }
}

@ApiTags('Projects')
@Controller('notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@StaffOnly()
@ApiBearerAuth()
export class NotesController {
  constructor(private readonly svc: ProjectsService) {}

  @Delete(':id')
  remove(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.deleteNote(s, id, u);
  }
}

@ApiTags('Deliverables')
@Controller('deliverables')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DeliverablesController {
  constructor(private readonly svc: ProjectsService) {}

  @Get(':id')
  get(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.getDeliverable(s, id, u);
  }

  @Patch(':id')
  @StaffOnly()
  update(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliverableDto,
  ) {
    return this.svc.updateDeliverable(s, id, u, dto);
  }

  @Delete(':id')
  @StaffOnly()
  remove(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.removeDeliverable(s, id, u);
  }

  @Post(':id/versions')
  @StaffOnly()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: tmpdir() }),
      limits: { fileSize: MAX_DELIVERABLE },
    }),
  )
  upload(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadVersionDto,
  ) {
    return this.svc.uploadVersion(s, id, u, file, dto.note);
  }

  @Get(':id/versions/:versionId/stream')
  stream(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.svc.streamUrl(s, id, versionId, u);
  }

  @Get(':id/download')
  download(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.downloadUrl(s, id, u);
  }

  @Post(':id/comments')
  comment(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommentDto,
  ) {
    return this.svc.comment(s, id, u, dto);
  }

  @Patch(':id/comments/:commentId')
  @StaffOnly()
  resolve(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: ResolveDto,
  ) {
    return this.svc.resolveComment(s, id, commentId, u, dto.resolved);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.approve(s, id, u);
  }

  @Post(':id/request-changes')
  @HttpCode(HttpStatus.OK)
  requestChanges(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestChangesDto,
  ) {
    return this.svc.requestChanges(s, id, u, dto.body);
  }

  @Post(':id/versions/:versionId/stems')
  @StaffOnly()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: tmpdir() }),
      limits: { fileSize: MAX_DELIVERABLE },
    }),
  )
  uploadStem(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadStemDto,
  ) {
    return this.svc.uploadStem(s, id, versionId, u, file, dto.name);
  }

  @Delete(':id/versions/:versionId/stems/:stemId')
  @StaffOnly()
  deleteStem(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Param('stemId', ParseUUIDPipe) stemId: string,
  ) {
    return this.svc.deleteStem(s, id, versionId, stemId, u);
  }
}

@ApiTags('Contracts & Split Sheets')
@Controller('contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get('project/:projectId')
  list(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.svc.listContracts(s, projectId, u);
  }

  @Get(':id')
  get(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.getContract(s, id, u);
  }

  @Post('project/:projectId')
  @StaffOnly()
  create(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.svc.createContract(s, projectId, u, dto);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  sign(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
  ) {
    return this.svc.signContract(s, id, u, dto);
  }

  @Delete(':id')
  @StaffOnly()
  remove(
    @StudioId() s: string,
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.deleteContract(s, id, u);
  }
}
