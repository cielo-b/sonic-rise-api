import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NextFunction, Request, Response } from 'express';
import { Studio } from '../../database/entities';

export interface TenantRequest extends Request {
  studio?: Studio | null;
}

/**
 * Works out which studio a request is for, in order:
 *   1. `X-Studio: <slug>` header (sent by the web app)
 *   2. subdomain of BASE_DOMAIN, e.g. sonicrise.<BASE_DOMAIN>
 *   3. DEFAULT_STUDIO (single-studio deployments)
 * Sets req.studio to the active studio or null. Routes that need a studio
 * fail through @StudioId(); routes that don't (platform admin) ignore it.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly baseDomain: string | undefined;
  private readonly defaultSlug: string | undefined;
  private readonly cache = new Map<
    string,
    { studio: Studio | null; at: number }
  >();

  constructor(
    config: ConfigService,
    @InjectRepository(Studio) private readonly studios: Repository<Studio>,
  ) {
    this.baseDomain = config.get<string>('BASE_DOMAIN')?.toLowerCase();
    this.defaultSlug = config.get<string>('DEFAULT_STUDIO')?.toLowerCase();
  }

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const slug = this.slugFor(req);
    req.studio = slug ? await this.find(slug) : null;
    next();
  }

  private slugFor(req: Request): string | undefined {
    const query = typeof req.query?.studio === 'string' ? (req.query.studio as string).trim().toLowerCase() : undefined;
    if (query) return query;
    const header = req.header('x-studio')?.trim().toLowerCase();
    if (header) return header;
    const host = (
      req.header('x-forwarded-host') ??
      req.hostname ??
      ''
    ).toLowerCase();
    if (this.baseDomain && host.endsWith(`.${this.baseDomain}`)) {
      const sub = host.slice(0, -(this.baseDomain.length + 1));
      if (sub && !sub.includes('.') && sub !== 'www' && sub !== 'api')
        return sub;
    }
    return this.defaultSlug;
  }

  /** Short cache: studio lookups happen on every request. */
  private async find(slug: string): Promise<Studio | null> {
    const hit = this.cache.get(slug);
    if (hit && Date.now() - hit.at < 30_000) return hit.studio;
    const studio = await this.studios.findOne({
      where: { slug, isActive: true },
    });
    this.cache.set(slug, { studio, at: Date.now() });
    return studio;
  }
}
