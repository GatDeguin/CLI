import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { JwtService } from '../common/auth/jwt.service';
import { AdminRepository } from './admin.repository';
import { AdminInterventionDto, AdminLoginDto, ModuleQueryDto, UpdateUserRoleDto } from './dto/admin.dto';
import { AdminModuleKey, AppRole, getModulePermission, getPermissionsForRole } from './admin-permissions';

const REFRESH_TTL_SECONDS = Number(process.env.ADMIN_REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 7);
const MODULE_SET = new Set<AdminModuleKey>(['profesionales', 'agendas', 'cobertura', 'pagos', 'documentos', 'auditoria', 'parametros']);

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly jwt: JwtService
  ) {}

  async login(dto: AdminLoginDto) {
    const user = await this.repo.prisma.appUser.findFirst({
      where: { OR: [{ email: dto.username }, { dni: dto.username }] }
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const credentials = await this.repo.prisma.authCredential.findUnique({ where: { userId: user.id } });
    if (!credentials || !this.verifyPassword(dto.password, credentials.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const refreshToken = randomBytes(32).toString('hex');
    const session = await this.repo.prisma.deviceSession.create({
      data: {
        userId: user.id,
        deviceId: dto.deviceId ?? 'admin-web',
        refreshTokenHash: this.hashToken(refreshToken)
      }
    });

    return {
      accessToken: this.jwt.sign({ id: user.id, dni: user.dni, role: user.role }),
      expiresInSeconds: Number(process.env.JWT_TTL_SECONDS ?? 3600),
      refreshToken,
      sessionId: session.id,
      operator: {
        id: user.id,
        name: user.fullName,
        role: user.role,
        permissions: getPermissionsForRole(user.role)
      }
    };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const session = await this.repo.prisma.deviceSession.findFirst({
      where: { refreshTokenHash: hash, revokedAt: null },
      include: { user: true }
    });

    if (!session) throw new UnauthorizedException('Refresh token inválido');
    if (session.createdAt.getTime() + REFRESH_TTL_SECONDS * 1000 < Date.now()) {
      await this.repo.prisma.deviceSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token expirado');
    }

    const nextRefreshToken = randomBytes(32).toString('hex');
    await this.repo.prisma.deviceSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.hashToken(nextRefreshToken), lastSeenAt: new Date() }
    });

    return {
      accessToken: this.jwt.sign({ id: session.user.id, dni: session.user.dni, role: session.user.role }),
      expiresInSeconds: Number(process.env.JWT_TTL_SECONDS ?? 3600),
      refreshToken: nextRefreshToken,
      operator: {
        id: session.user.id,
        name: session.user.fullName,
        role: session.user.role,
        permissions: getPermissionsForRole(session.user.role)
      }
    };
  }

  async me(userId: string) {
    const user = await this.repo.prisma.appUser.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      name: user.fullName,
      role: user.role,
      permissions: getPermissionsForRole(user.role)
    };
  }

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.repo.prisma.deviceSession.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { revoked: true };
  }

  updateRole(dto: UpdateUserRoleDto) {
    return this.repo.prisma.appUser.update({ where: { id: dto.userId }, data: { role: dto.role } });
  }

  async listRecords(userRole: AppRole, module: string, query: ModuleQueryDto) {
    const permission = this.requireModuleAccess(userRole, module);
    const typedModule = module as AdminModuleKey;
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Math.min(50, Number(query.pageSize ?? 8)));
    const q = (query.q ?? '').trim().toLowerCase();

    const records = await this.fetchModuleRecords(typedModule);
    const filtered = records.filter((record: any) => {
      const matchesQ = !q || Object.values(record).join(' ').toLowerCase().includes(q);
      const matchesStatus = !query.status || query.status === 'Todos' || record.estado === query.status;
      return matchesQ && matchesStatus;
    });

    return {
      page,
      pageSize,
      total: filtered.length,
      items: filtered.slice((page - 1) * pageSize, page * pageSize).map((record: { id: string; estado: string; cobertura: string; profesional: string; paciente: string; detalle: string; allowedActions: Array<'cancelar' | 'reprogramar' | 'devolver' | 'publicar'> }) => ({
        ...record,
        allowedActions: record.allowedActions.filter((action) => permission.actions.includes(action))
      }))
    };
  }

  async listHistory(userRole: AppRole, module: string, recordId: string) {
    this.requireModuleAccess(userRole, module);
    const logs = await this.repo.prisma.auditLog.findMany({
      where: {
        OR: [
          { entity: module, entityId: recordId },
          { entity: `${module}:record`, entityId: recordId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
      take: 50
    });

    return logs.map((entry: { id: string; action: string; createdAt: Date; user: { fullName: string } }) => ({
      id: entry.id,
      recordId,
      date: entry.createdAt.toISOString(),
      actor: entry.user.fullName,
      change: entry.action
    }));
  }

  async intervene(userId: string, userRole: AppRole, module: string, recordId: string, dto: AdminInterventionDto) {
    this.requireModuleAccess(userRole, module, dto.action);

    if (module === 'pagos' && dto.action === 'devolver') {
      await this.repo.prisma.payment.updateMany({ where: { id: recordId }, data: { status: 'REFUNDED' } });
    }

    await this.repo.prisma.auditLog.create({
      data: {
        userId,
        action: `Intervención: ${dto.action}`,
        entity: module,
        entityId: recordId,
        payload: { action: dto.action }
      }
    });

    return this.listHistory(userRole, module, recordId);
  }

  private requireModuleAccess(role: AppRole, module: string, action?: string) {
    if (!MODULE_SET.has(module as AdminModuleKey)) {
      throw new ForbiddenException('Módulo inválido');
    }
    const permission = getModulePermission(role, module);
    if (!permission) throw new ForbiddenException('Sin acceso al módulo');
    if (action && !permission.actions.includes(action as 'cancelar' | 'reprogramar' | 'devolver' | 'publicar')) {
      throw new ForbiddenException('Sin permiso para ejecutar la acción');
    }
    return permission;
  }

  private async fetchModuleRecords(module: AdminModuleKey) {
    switch (module) {
      case 'profesionales': {
        const rows = await this.repo.prisma.professional.findMany({ take: 200, orderBy: { fullName: 'asc' } });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: 'Activo',
          cobertura: 'N/A',
          profesional: item.fullName,
          paciente: '-',
          fecha: new Date().toISOString(),
          detalle: `Matrícula ${item.licenseNumber}`,
          allowedActions: ['cancelar', 'reprogramar', 'publicar'] as const
        }));
      }
      case 'agendas': {
        const rows = await this.repo.prisma.agenda.findMany({
          take: 200,
          include: { professional: true, site: true },
          orderBy: { validFrom: 'desc' }
        });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: item.validTo && item.validTo < new Date() ? 'Cerrada' : 'Abierta',
          cobertura: item.site.code,
          profesional: item.professional.fullName,
          paciente: '-',
          fecha: item.validFrom.toISOString(),
          detalle: item.site.name,
          allowedActions: ['cancelar', 'reprogramar'] as const
        }));
      }
      case 'cobertura': {
        const rows = await this.repo.prisma.coverage.findMany({
          take: 200,
          include: { patient: true, plan: true },
          orderBy: { createdAt: 'desc' }
        });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: item.status,
          cobertura: item.plan.name,
          profesional: '-',
          paciente: item.patient.fullName,
          fecha: item.createdAt.toISOString(),
          detalle: `Afiliado ${item.memberNumber}`,
          allowedActions: ['publicar'] as const
        }));
      }
      case 'pagos': {
        const rows = await this.repo.prisma.payment.findMany({
          take: 200,
          include: { patient: true },
          orderBy: { createdAt: 'desc' }
        });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: item.status,
          cobertura: item.currency,
          profesional: '-',
          paciente: item.patient.fullName,
          fecha: item.createdAt.toISOString(),
          detalle: `Ref ${item.externalReference ?? 'N/A'} · $${item.amount.toString()}`,
          allowedActions: ['devolver', 'cancelar'] as const
        }));
      }
      case 'documentos': {
        const rows = await this.repo.prisma.document.findMany({
          take: 200,
          include: { patient: true },
          orderBy: { createdAt: 'desc' }
        });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: item.publishedAt ? 'Publicado' : 'Borrador',
          cobertura: item.type,
          profesional: '-',
          paciente: item.patient.fullName,
          fecha: item.createdAt.toISOString(),
          detalle: item.url,
          allowedActions: ['publicar', 'cancelar'] as const
        }));
      }
      case 'auditoria': {
        const rows = await this.repo.prisma.auditLog.findMany({
          take: 200,
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: 'INFO',
          cobertura: item.entity,
          profesional: item.user.fullName,
          paciente: '-',
          fecha: item.createdAt.toISOString(),
          detalle: item.action,
          allowedActions: [] as const
        }));
      }
      case 'parametros': {
        const rows = await this.repo.prisma.businessRule.findMany({
          take: 200,
          orderBy: { updatedAt: 'desc' }
        });
        return rows.map((item: any) => ({
          id: item.id,
          module,
          estado: item.validTo && item.validTo < new Date() ? 'Inactivo' : 'Vigente',
          cobertura: item.domain,
          profesional: '-',
          paciente: '-',
          fecha: item.updatedAt.toISOString(),
          detalle: `${item.ruleCode} (prio ${item.priority})`,
          allowedActions: ['publicar'] as const
        }));
      }
    }
  }

  private verifyPassword(password: string, encoded: string): boolean {
    const [salt, hash] = encoded.split(':');
    const attempt = pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
