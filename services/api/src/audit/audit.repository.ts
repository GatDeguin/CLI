import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditQueryDto } from './dto/audit.dto';

@Injectable()
export class AuditRepository {
  constructor(readonly prisma: PrismaService) {}
  query(filters: AuditQueryDto) {
    return this.prisma.auditLog.findMany({ where: { entity: filters.entity, userId: filters.userId }, orderBy: { createdAt: 'desc' } });
  }
}
