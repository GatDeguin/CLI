import { Module } from '@nestjs/common';
import { MessagingAdapter } from '../integrations/adapters/messaging.adapter';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './identity.repository';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentityRepository, MessagingAdapter],
  exports: [IdentityService]
})
export class IdentityModule {}
