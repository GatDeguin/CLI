import { Module } from '@nestjs/common';
import { RulesEngine } from './rules.engine';

@Module({
  providers: [RulesEngine],
  exports: [RulesEngine]
})
export class RulesModule {}
