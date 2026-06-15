import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
 * Attach required roles to a route handler or controller.
 * Used together with RolesGuard.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
