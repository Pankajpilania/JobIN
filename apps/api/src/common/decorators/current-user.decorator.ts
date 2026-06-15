import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser()
 * Extracts the authenticated user payload from request.user
 * (set by SupabaseAuthGuard after token verification).
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(SupabaseAuthGuard)
 *   getProfile(@CurrentUser() user: SupabaseUserPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/** Shape of Supabase's user payload attached to request.user */
export interface SupabaseUserPayload {
  /** Supabase user ID — maps to User.supabaseId in our DB */
  id: string;
  /** Same as id, for backwards compatibility */
  sub: string;
  email?: string;
  roles?: string[];
  dbUser?: any;
}

// Alias for backwards compatibility during migration
export type ClerkUserPayload = SupabaseUserPayload;
