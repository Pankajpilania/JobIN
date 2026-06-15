import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase-jwt') {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`Unauthorized access attempt: ${info?.message || err?.message}`);
      throw err || new UnauthorizedException('Missing or invalid Authorization header');
    }
    return user;
  }
}
