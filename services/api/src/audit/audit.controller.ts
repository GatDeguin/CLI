import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit.dto';

@Controller('audit')
@Roles('ADMIN', 'AUDITOR')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get() list(@Query() query: AuditQueryDto) { return this.service.list(query); }
}
