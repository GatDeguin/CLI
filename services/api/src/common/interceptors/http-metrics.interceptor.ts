import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../../observability/metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; route?: { path?: string }; url: string }>();
    const res = context.switchToHttp().getResponse<{ statusCode: number }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const route = req.route?.path ?? req.url;
          this.metricsService.observeHttpRequest(req.method, route, res.statusCode, Date.now() - startedAt);
        },
        error: () => {
          const route = req.route?.path ?? req.url;
          const status = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
          this.metricsService.observeHttpRequest(req.method, route, status, Date.now() - startedAt);
        }
      })
    );
  }
}
