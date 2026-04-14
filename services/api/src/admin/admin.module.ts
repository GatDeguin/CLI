import { Module } from '@nestjs/common';
import { AuthModule } from '../common/auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService]
})
export class AdminModule {}
