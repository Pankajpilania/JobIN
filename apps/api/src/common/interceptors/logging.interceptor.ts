import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, ip } = req;
    const path = req.path || '/';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const ms = Date.now() - start;
          this.logger.log(`${method} ${path} ${res.statusCode} — ${ms}ms [${ip}]`);
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.warn(`${method} ${path} ERROR — ${ms}ms [${ip}]`);
        },
      }),
    );
  }
}
