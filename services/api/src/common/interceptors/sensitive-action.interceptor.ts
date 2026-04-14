import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SensitiveActionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; url: string; user?: { sub?: string } }>();
    const isSensitive = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!isSensitive || !req.user?.sub) return next.handle();

    return next.handle().pipe(
      tap(async () => {
        await this.prisma.auditLog.create({
          data: {
            userId: req.user!.sub!,
            action: req.method,
            entity: req.url,
            entityId: 'n/a',
            payload: { sensitive: true }
          }
        });
      })
    );
  }
}
