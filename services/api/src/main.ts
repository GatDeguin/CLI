import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SensitiveActionInterceptor } from './common/interceptors/sensitive-action.interceptor';
import { PrismaService } from './common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new SensitiveActionInterceptor(app.get(PrismaService)));
  await app.get(PrismaService).enableShutdownHooks(app);
  await app.listen(3000);
}

void bootstrap();
