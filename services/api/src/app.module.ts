import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './common/auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { CoverageModule } from './coverage/coverage.module';
import { DirectoryModule } from './directory/directory.module';
import { DocumentsModule } from './documents/documents.module';
import { IdentityModule } from './identity/identity.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientModule } from './patient/patient.module';
import { PaymentsModule } from './payments/payments.module';
import { RulesModule } from './rules/rules.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    IdentityModule,
    PatientModule,
    CoverageModule,
    DirectoryModule,
    SchedulingModule,
    PaymentsModule,
    DocumentsModule,
    NotificationsModule,
    AdminModule,
    AuditModule,
    IntegrationsModule,
    RulesModule,
    ObservabilityModule
  ],
  controllers: [AppController]
})
export class AppModule {}
