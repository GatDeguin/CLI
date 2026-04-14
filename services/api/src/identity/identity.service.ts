import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { MessagingAdapter } from '../integrations/adapters/messaging.adapter';
import { JwtService } from '../common/auth/jwt.service';
import { IdentityRepository } from './identity.repository';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterByDniDto,
  RequestOtpDto,
  RequestRecoveryDto,
  ResetPasswordDto
} from './dto/identity.dto';

const OTP_TTL_MS = 5 * 60_000;
const RECOVERY_TTL_MS = 30 * 60_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOCKOUT_TTL_MS = 15 * 60_000;

type SecurityContext = {
  readonly dni: string;
  readonly deviceId?: string;
  readonly ipAddress?: string;
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly messagingAdapter: MessagingAdapter
  ) {}

  async registerByDni(dto: RegisterByDniDto) {
    const user = await this.repo.prisma.appUser.create({
      data: {
        dni: dto.dni,
        email: dto.email,
        fullName: dto.fullName,
        profile: 'PARTICULAR',
        credentials: { create: { passwordHash: this.hashPassword(dto.password) } }
      }
    });
    return { id: user.id, dni: user.dni, email: user.email };
  }

  async requestOtp(dto: RequestOtpDto) {
    const context: SecurityContext = { dni: dto.dni, deviceId: dto.deviceId, ipAddress: dto.ipAddress };
    await this.assertNotLocked(context);
    await this.assertRateLimit('OTP_REQUEST', context);

    const existingChallenge = await this.repo.prisma.otpChallenge.findFirst({
      where: {
        dni: dto.dni,
        purpose: 'LOGIN',
        consumedAt: null,
        expiresAt: { gt: new Date() },
        deviceId: dto.deviceId ?? null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingChallenge) {
      return { challengeId: existingChallenge.id, expiresAt: existingChallenge.expiresAt };
    }

    const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const challenge = await this.repo.prisma.otpChallenge.create({
      data: {
        dni: dto.dni,
        otpCode: this.hashToken(otpCode),
        purpose: 'LOGIN',
        deviceId: dto.deviceId,
        expiresAt: new Date(Date.now() + OTP_TTL_MS)
      }
    });

    await this.repo.prisma.otpChallenge.create({
      data: {
        dni: dto.dni,
        otpCode: 'event',
        purpose: 'OTP_REQUEST',
        deviceId: this.deviceFingerprint(dto.deviceId, dto.ipAddress),
        expiresAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS)
      }
    });

    this.messagingAdapter.sendOtp(
      {
        channel: dto.channel ?? 'sms',
        destination: dto.destination ?? dto.dni,
        code: otpCode
      },
      challenge.id
    );

    return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
  }

  async login(dto: LoginDto) {
    const context: SecurityContext = { dni: dto.dni, deviceId: dto.deviceId, ipAddress: dto.ipAddress };
    await this.assertNotLocked(context);

    const challenge = await this.repo.prisma.otpChallenge.findFirst({
      where: { dni: dto.dni, purpose: 'LOGIN', consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!challenge || challenge.expiresAt < new Date() || challenge.otpCode !== this.hashToken(dto.otpCode)) {
      await this.recordFailedAttempt(context, 'LOGIN_FAILURE', 'otp_invalid_or_expired');
      throw new UnauthorizedException('OTP inválido o vencido');
    }

    const user = await this.repo.prisma.appUser.findUnique({ where: { dni: dto.dni } });
    if (!user) {
      await this.recordFailedAttempt(context, 'LOGIN_FAILURE', 'user_not_found');
      throw new UnauthorizedException('Usuario no encontrado');
    }

    await this.repo.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

    const refreshToken = randomBytes(32).toString('hex');
    const session = await this.repo.prisma.deviceSession.create({
      data: {
        userId: user.id,
        deviceId: dto.deviceId,
        refreshTokenHash: this.hashToken(refreshToken)
      }
    });

    return {
      accessToken: this.jwt.sign({ id: user.id, dni: user.dni, role: user.role }),
      sessionId: session.id
    };
  }

  async requestRecovery(dto: RequestRecoveryDto) {
    const context: SecurityContext = { dni: dto.dni, deviceId: dto.deviceId, ipAddress: dto.ipAddress };
    await this.assertNotLocked(context);
    await this.assertRateLimit('RECOVERY_REQUEST', context);

    const user = await this.repo.prisma.appUser.findUnique({ where: { dni: dto.dni } });
    if (!user) throw new BadRequestException('DNI sin usuario');

    const token = randomBytes(24).toString('hex');
    await this.repo.prisma.accessRecovery.create({
      data: { token: this.hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RECOVERY_TTL_MS) }
    });

    await this.repo.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ACCESS_RECOVERY_REQUESTED',
        entity: 'identity',
        entityId: user.id,
        payload: {
          deviceIdHash: this.redact(dto.deviceId),
          ipHash: this.redact(dto.ipAddress)
        }
      }
    });

    this.messagingAdapter.sendEmail(
      {
        to: user.email,
        subject: 'Recuperación de acceso',
        html: `Código de recuperación generado. Expira en ${RECOVERY_TTL_MS / 60_000} minutos.`
      },
      user.id
    );

    return { accepted: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const recovery = await this.repo.prisma.accessRecovery.findUnique({ where: { token: tokenHash } });
    if (!recovery || recovery.expiresAt < new Date() || recovery.consumedAt) {
      throw new UnauthorizedException('Token de recuperación inválido');
    }

    await this.repo.prisma.authCredential.upsert({
      where: { userId: recovery.userId },
      update: { passwordHash: this.hashPassword(dto.newPassword), passwordUpdated: new Date() },
      create: { userId: recovery.userId, passwordHash: this.hashPassword(dto.newPassword) }
    });
    await this.repo.prisma.accessRecovery.update({ where: { id: recovery.id }, data: { consumedAt: new Date() } });

    await this.repo.prisma.auditLog.create({
      data: {
        userId: recovery.userId,
        action: 'PASSWORD_RESET',
        entity: 'identity',
        entityId: recovery.userId,
        payload: { recoveryId: recovery.id }
      }
    });

    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const credentials = await this.repo.prisma.authCredential.findUnique({ where: { userId } });
    if (!credentials || !this.verifyPassword(dto.currentPassword, credentials.passwordHash)) {
      throw new UnauthorizedException('Contraseña actual inválida');
    }
    await this.repo.prisma.authCredential.update({
      where: { userId },
      data: { passwordHash: this.hashPassword(dto.newPassword), passwordUpdated: new Date() }
    });
    return { success: true };
  }

  async listSessions(userId: string) {
    return this.repo.prisma.deviceSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.repo.prisma.deviceSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { revoked: true };
  }

  private async assertRateLimit(action: 'OTP_REQUEST' | 'RECOVERY_REQUEST', context: SecurityContext): Promise<void> {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const keySet = this.securityKeys(context);
    const attempts = await this.repo.prisma.otpChallenge.count({
      where: {
        purpose: action,
        createdAt: { gte: since },
        OR: keySet
      }
    });

    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      await this.lockContext(context, `RATE_LIMIT_${action}`);
      throw new HttpException('Demasiados intentos. Intenta nuevamente más tarde.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async assertNotLocked(context: SecurityContext): Promise<void> {
    const activeLock = await this.repo.prisma.otpChallenge.findFirst({
      where: {
        purpose: { startsWith: 'LOCKOUT_' },
        expiresAt: { gt: new Date() },
        OR: this.securityKeys(context)
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeLock) {
      throw new HttpException('Acceso bloqueado temporalmente por seguridad.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordFailedAttempt(context: SecurityContext, purpose: string, reason: string): Promise<void> {
    await this.repo.prisma.otpChallenge.create({
      data: {
        dni: context.dni,
        otpCode: 'failed',
        purpose,
        deviceId: this.deviceFingerprint(context.deviceId, context.ipAddress),
        expiresAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS)
      }
    });

    const attempts = await this.repo.prisma.otpChallenge.count({
      where: {
        purpose,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
        OR: this.securityKeys(context)
      }
    });

    const user = await this.repo.prisma.appUser.findUnique({ where: { dni: context.dni } });
    if (user) {
      await this.repo.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          entity: 'identity',
          entityId: user.id,
          payload: {
            reason,
            deviceIdHash: this.redact(context.deviceId),
            ipHash: this.redact(context.ipAddress)
          }
        }
      });
    }

    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      await this.lockContext(context, `LOCKOUT_${purpose}`);
    }
  }

  private async lockContext(context: SecurityContext, purpose: string): Promise<void> {
    await this.repo.prisma.otpChallenge.create({
      data: {
        dni: context.dni,
        otpCode: 'lock',
        purpose,
        deviceId: this.deviceFingerprint(context.deviceId, context.ipAddress),
        expiresAt: new Date(Date.now() + LOCKOUT_TTL_MS)
      }
    });
  }

  private securityKeys(context: SecurityContext): Array<{ dni?: string; deviceId?: string }> {
    const keys: Array<{ dni?: string; deviceId?: string }> = [{ dni: context.dni }];
    if (context.deviceId) keys.push({ deviceId: this.deviceFingerprint(context.deviceId) });
    if (context.ipAddress) keys.push({ deviceId: this.deviceFingerprint(undefined, context.ipAddress) });
    if (context.deviceId || context.ipAddress) {
      keys.push({ deviceId: this.deviceFingerprint(context.deviceId, context.ipAddress) });
    }
    return keys;
  }

  private deviceFingerprint(deviceId?: string, ipAddress?: string): string | undefined {
    if (!deviceId && !ipAddress) return undefined;
    return `ctx:${this.hashToken(`${deviceId ?? '-'}|${ipAddress ?? '-'}`)}`;
  }

  private redact(value?: string): string | undefined {
    if (!value) return undefined;
    return this.hashToken(value).slice(0, 12);
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
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
