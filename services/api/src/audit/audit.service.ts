import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { AuditQueryDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}
  list(filters: AuditQueryDto) { return this.repo.query(filters); }
}
