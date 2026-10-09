import { Role } from '../database/enums';

/**
 * What each team role may do inside its studio. Clients have no permissions
 * here — they only ever reach their own records through ownership checks.
 * Mirrored in the web app (src/lib/roles.ts); keep the two in sync.
 */
export enum Permission {
  BOOKINGS_READ = 'bookings.read',
  BOOKINGS_WRITE = 'bookings.write',
  CLIENTS_READ = 'clients.read',
  CLIENTS_WRITE = 'clients.write',
  STAFF_MANAGE = 'staff.manage',
  RESOURCES_MANAGE = 'resources.manage', // rooms, equipment, packages
  FINANCE_READ = 'finance.read',
  FINANCE_WRITE = 'finance.write', // quotes, invoices, manual payments
  PROJECTS_READ = 'projects.read',
  PROJECTS_WRITE = 'projects.write',
  DELIVERABLES_UPLOAD = 'deliverables.upload',
  CONTENT_WRITE = 'content.write', // site content, blog, portfolio, media
  REPORTS_READ = 'reports.read',
  STUDIO_SETTINGS = 'studio.settings', // branding, booking rules
  STUDIO_BILLING = 'studio.billing', // payment provider credentials
}

const ALL = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.PLATFORM_ADMIN]: ALL,
  [Role.OWNER]: ALL,
  [Role.MANAGER]: ALL.filter((p) => p !== Permission.STUDIO_BILLING),
  [Role.ENGINEER]: [
    Permission.BOOKINGS_READ,
    Permission.CLIENTS_READ,
    Permission.PROJECTS_READ,
    Permission.PROJECTS_WRITE,
    Permission.DELIVERABLES_UPLOAD,
  ],
  [Role.FRONT_DESK]: [
    Permission.BOOKINGS_READ,
    Permission.BOOKINGS_WRITE,
    Permission.CLIENTS_READ,
    Permission.CLIENTS_WRITE,
    Permission.FINANCE_READ,
    Permission.FINANCE_WRITE,
    Permission.PROJECTS_READ,
  ],
  [Role.CLIENT]: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Roles a given role may assign when inviting or editing staff. */
export function assignableRoles(role: Role): Role[] {
  if (role === Role.OWNER || role === Role.PLATFORM_ADMIN) {
    return [Role.OWNER, Role.MANAGER, Role.ENGINEER, Role.FRONT_DESK];
  }
  if (role === Role.MANAGER) {
    return [Role.MANAGER, Role.ENGINEER, Role.FRONT_DESK];
  }
  return [];
}
