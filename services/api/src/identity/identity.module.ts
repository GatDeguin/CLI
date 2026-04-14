import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './identity.repository';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentityRepository],
  exports: [IdentityService]
})
export class IdentityModule {}
