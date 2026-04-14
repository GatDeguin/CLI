import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_PROFILE_REQUIRED } from './active-profile.decorator';

@Injectable()
export class ActiveProfileGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(ACTIVE_PROFILE_REQUIRED, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required) return true;
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: { sub?: string }; activePatientId?: string }>();
    const activePatientId = req.headers['x-active-patient-id'];
    if (!activePatientId || !req.user?.sub) throw new ForbiddenException('Perfil familiar activo requerido');

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: activePatientId,
        OR: [{ userId: req.user.sub }, { dependentOfUserId: req.user.sub }]
      },
      select: { id: true }
    });
    if (!patient) throw new ForbiddenException('Perfil activo inválido para este usuario');
    req.activePatientId = patient.id;
    return true;
  }
}
