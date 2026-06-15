import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class ClerkAuthGuard extends AuthGuard('clerk-jwt') {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`Unauthorized access attempt: ${info?.message || err?.message}`);
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    return user;
  }
}
