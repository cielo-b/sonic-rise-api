import { Controller, Sse, MessageEvent, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { EventsService } from './events.service';
import { StudioId } from '../common/decorators/studio.decorator';

@ApiTags('Realtime Events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Realtime Server-Sent Events stream for studio updates' })
  stream(
    @StudioId() studioId: string,
    @Query('studio') studioQuery?: string,
  ): Observable<MessageEvent> {
    return this.events.subscribe(studioId || studioQuery || '');
  }
}
