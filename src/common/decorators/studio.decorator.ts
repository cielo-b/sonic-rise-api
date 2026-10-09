import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../database/enums';
import type { User } from '../../database/entities';
import type { TenantRequest } from '../tenant/tenant.middleware';

/**
 * The studio the current request acts on. Signed-in studio users always act
 * on their own studio; anonymous visitors and platform admins act on the
 * studio resolved from the request (header / subdomain / default).
 */
export function resolveStudioId(req: TenantRequest & { user?: User }): string {
  const user = req.user;
  if (user && user.role !== Role.PLATFORM_ADMIN && user.studioId) {
    return user.studioId;
  }
  if (req.studio) return req.studio.id;
  throw new NotFoundException('Studio not found');
}

export const StudioId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    resolveStudioId(ctx.switchToHttp().getRequest()),
);

/** The resolved studio entity (public routes). */
export const CurrentStudio = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<TenantRequest>();
    if (!req.studio) throw new NotFoundException('Studio not found');
    return req.studio;
  },
);

/** The studio resolved from the request, or null (platform-level requests). */
export const RequestStudioId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null =>
    ctx.switchToHttp().getRequest<TenantRequest>().studio?.id ?? null,
);
