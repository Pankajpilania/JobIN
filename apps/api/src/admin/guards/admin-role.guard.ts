import {
  CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/** Roles that are allowed to access admin endpoints */
const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'] as const;
type AdminRole = typeof ADMIN_ROLES[number];

export const REQUIRED_ADMIN_ROLE_KEY = 'requiredAdminRole';

/** Decorate a handler with @RequireAdminRole('FINANCE_ADMIN') to restrict further */
export const RequireAdminRole = (role: AdminRole) =>
  Reflect.metadata(REQUIRED_ADMIN_ROLE_KEY, role);

@Injectable()
export class AdminRoleGuard implements CanActivate {
  private readonly logger = new Logger(AdminRoleGuard.name);

  constructor(
    private readonly prisma:     PrismaService,
    private readonly reflector:  Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<any>();
    const supabaseUser = request.user; // set by SupabaseAuthGuard

    if (!supabaseUser?.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Load user + roles from the database
    const user = await this.prisma.user.findUnique({
      where:   { supabaseId: supabaseUser.id },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account suspended');
    }

    const userRoles = user.roles.map(ur => ur.role.name);
    const hasAdminRole = userRoles.some(r => ADMIN_ROLES.includes(r as AdminRole));

    if (!hasAdminRole) {
      this.logger.warn(`Admin access denied for user ${user.id} (roles: ${userRoles.join(', ')})`);
      throw new ForbiddenException('Admin role required');
    }

    // Optional: check a specific role required by the handler
    const required = this.reflector.get<AdminRole>(
      REQUIRED_ADMIN_ROLE_KEY,
      ctx.getHandler(),
    );
    if (required && !userRoles.includes(required) && !userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(`Role ${required} required for this action`);
    }

    // Attach admin context for audit logging
    request.adminUser = user;
    return true;
  }
}
