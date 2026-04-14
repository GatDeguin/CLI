import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ActiveProfileGuard } from './active-profile.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from './jwt.service';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    JwtService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ActiveProfileGuard }
  ],
  exports: [JwtService]
})
export class AuthModule {}
