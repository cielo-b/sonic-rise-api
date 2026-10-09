import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, hasPermission } from '../permissions';
import { Role, STAFF_ROLES } from '../../database/enums';
import type { User } from '../../database/entities';

const PERMISSIONS_KEY = 'permissions';
const STAFF_KEY = 'staffOnly';
const PLATFORM_KEY = 'platformOnly';

/** Route requires every listed permission. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Route is for any team member (not clients). */
export const StaffOnly = () => SetMetadata(STAFF_KEY, true);

/** Route is for platform admins only. */
export const PlatformOnly = () => SetMetadata(PLATFORM_KEY, true);

/** Use after JwtAuthGuard. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const required =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        targets,
      ) ?? [];
    const staffOnly = this.reflector.getAllAndOverride<boolean>(
      STAFF_KEY,
      targets,
    );
    const platformOnly = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_KEY,
      targets,
    );

    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user) throw new ForbiddenException();

    if (platformOnly && user.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException();
    }
    const isStaff =
      user.role === Role.PLATFORM_ADMIN || STAFF_ROLES.includes(user.role);
    if (staffOnly && !isStaff) throw new ForbiddenException();
    if (!required.every((p) => hasPermission(user.role, p))) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
