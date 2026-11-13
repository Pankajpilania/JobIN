import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminRoleGuard,
  REQUIRED_ADMIN_PERMISSION_KEY,
  REQUIRED_ADMIN_ROLES_KEY,
} from './admin-role.guard';

describe('AdminRoleGuard role restrictions', () => {
  const handler = () => undefined;

  function makeGuard(
    roleNames: string[],
    requiredRoles: string[],
    actions: string[] = [],
    requiredPermission?: string,
  ) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-id',
          status: 'ACTIVE',
          roles: roleNames.map((name) => ({
            role: { name, permissions: actions.map((action) => ({ permission: { action } })) },
          })),
        }),
      },
    };
    const reflector = {
      get: jest.fn((key: string) => {
        if (key === REQUIRED_ADMIN_ROLES_KEY) return requiredRoles;
        if (key === REQUIRED_ADMIN_PERMISSION_KEY) return requiredPermission;
        return undefined;
      }),
    };
    const guard = new AdminRoleGuard(
      prisma as unknown as PrismaService,
      reflector as unknown as Reflector,
    );
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'auth-user-id' } }) }),
      getHandler: () => handler,
    };
    return { guard, context: context as any };
  }

  it('allows an administrator with one of the required roles', async () => {
    const { guard, context } = makeGuard(['SUPPORT_ADMIN'], ['SUPPORT_ADMIN', 'OPERATIONS_ADMIN']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies an administrator outside the required role set', async () => {
    const { guard, context } = makeGuard(['FINANCE_ADMIN'], ['SUPPORT_ADMIN', 'OPERATIONS_ADMIN']);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a super admin through role-specific restrictions', async () => {
    const { guard, context } = makeGuard(['SUPER_ADMIN'], ['SUPPORT_ADMIN', 'OPERATIONS_ADMIN']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows a role with the requested permission', async () => {
    const { guard, context } = makeGuard(
      ['SUPPORT_ADMIN'],
      [],
      ['support:write_tickets'],
      'support:write_tickets',
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a role missing the requested permission', async () => {
    const { guard, context } = makeGuard(
      ['SUPPORT_ADMIN'],
      [],
      ['support:read_tickets'],
      'support:write_tickets',
    );
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps the super admin permission bypass', async () => {
    const { guard, context } = makeGuard(['SUPER_ADMIN'], [], [], 'support:write_tickets');
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
