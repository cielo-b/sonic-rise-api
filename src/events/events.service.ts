import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface StudioEvent {
  studioId: string;
  type: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class EventsService {
  private readonly stream$ = new Subject<StudioEvent>();

  emit(studioId: string, type: string, payload: Record<string, unknown> = {}) {
    this.stream$.next({ studioId, type, payload });
  }

  subscribe(studioId: string): Observable<MessageEvent> {
    return this.stream$.asObservable().pipe(
      filter((e) => !studioId || e.studioId === studioId),
      map(
        (e) =>
          ({
            data: { type: e.type, payload: e.payload, timestamp: Date.now() },
          }) as MessageEvent,
      ),
    );
  }
}
