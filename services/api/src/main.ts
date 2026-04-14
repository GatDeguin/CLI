import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { SensitiveActionInterceptor } from './common/interceptors/sensitive-action.interceptor';
import { PrismaService } from './common/prisma/prisma.service';
import { MetricsService } from './observability/metrics.service';
import { validateBootstrapConfig } from './config/env.validation';

async function bootstrap() {
  validateBootstrapConfig();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(
    new HttpMetricsInterceptor(app.get(MetricsService)),
    new SensitiveActionInterceptor(app.get(PrismaService))
  );
  await app.get(PrismaService).enableShutdownHooks(app);
  await app.listen(3000);
}

void bootstrap();
