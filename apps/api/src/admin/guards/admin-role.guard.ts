import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/** Roles that are allowed to access admin endpoints */
const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

export const REQUIRED_ADMIN_ROLE_KEY = 'requiredAdminRole';
export const REQUIRED_ADMIN_ROLES_KEY = 'requiredAdminRoles';
export const REQUIRED_ADMIN_PERMISSION_KEY = 'requiredAdminPermission';

/** Decorate a handler with @RequireAdminRole('FINANCE_ADMIN') to restrict further */
export const RequireAdminRole = (role: AdminRole) =>
  Reflect.metadata(REQUIRED_ADMIN_ROLE_KEY, role);
/** Restrict a handler to one of the listed roles; super admins retain access. */
export const RequireAnyAdminRole = (...roles: AdminRole[]) =>
  Reflect.metadata(REQUIRED_ADMIN_ROLES_KEY, roles);
/** Require a permission granted through the role-permission table. */
export const RequireAdminPermission = (permission: string) =>
  Reflect.metadata(REQUIRED_ADMIN_PERMISSION_KEY, permission);

@Injectable()
export class AdminRoleGuard implements CanActivate {
  private readonly logger = new Logger(AdminRoleGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<any>();
    const supabaseUser = request.user; // set by SupabaseAuthGuard

    if (!supabaseUser?.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Load user + roles from the database
    const user = await this.prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account suspended');
    }

    const userRoles = user.roles.map((ur) => ur.role.name);
    const hasAdminRole = userRoles.some((r) => ADMIN_ROLES.includes(r as AdminRole));

    if (!hasAdminRole) {
      this.logger.warn(`Admin access denied for user ${user.id} (roles: ${userRoles.join(', ')})`);
      throw new ForbiddenException('Admin role required');
    }

    // Optional: check a specific role required by the handler
    const required = this.reflector.get<AdminRole>(REQUIRED_ADMIN_ROLE_KEY, ctx.getHandler());
    if (required && !userRoles.includes(required) && !userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(`Role ${required} required for this action`);
    }

    const requiredRoles = this.reflector.get<AdminRole[]>(
      REQUIRED_ADMIN_ROLES_KEY,
      ctx.getHandler(),
    );
    if (
      requiredRoles?.length &&
      !requiredRoles.some((role) => userRoles.includes(role)) &&
      !userRoles.includes('SUPER_ADMIN')
    ) {
      throw new ForbiddenException(`One of these roles is required: ${requiredRoles.join(', ')}`);
    }

    const requiredPermission = this.reflector.get<string>(
      REQUIRED_ADMIN_PERMISSION_KEY,
      ctx.getHandler(),
    );
    const hasPermission = user.roles.some((userRole) =>
      (userRole.role.permissions ?? []).some(
        ({ permission }) => permission.action === requiredPermission,
      ),
    );
    if (requiredPermission && !hasPermission && !userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(`Permission ${requiredPermission} required for this action`);
    }

    // Attach admin context for audit logging
    request.adminUser = user;
    return true;
  }
}
