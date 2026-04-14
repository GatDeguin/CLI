import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
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

@Injectable()
export class IdentityService {
  constructor(private readonly repo: IdentityRepository, private readonly jwt: JwtService) {}

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
    const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const challenge = await this.repo.prisma.otpChallenge.create({
      data: {
        dni: dto.dni,
        otpCode,
        purpose: 'LOGIN',
        deviceId: dto.deviceId,
        expiresAt: new Date(Date.now() + 5 * 60_000)
      }
    });
    return { challengeId: challenge.id, expiresAt: challenge.expiresAt, otpCode };
  }

  async login(dto: LoginDto) {
    const challenge = await this.repo.prisma.otpChallenge.findFirst({
      where: { dni: dto.dni, purpose: 'LOGIN', consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    if (!challenge || challenge.expiresAt < new Date() || challenge.otpCode !== dto.otpCode) {
      throw new UnauthorizedException('OTP inválido o vencido');
    }

    const user = await this.repo.prisma.appUser.findUnique({ where: { dni: dto.dni } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

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
      refreshToken,
      sessionId: session.id
    };
  }

  async requestRecovery(dto: RequestRecoveryDto) {
    const user = await this.repo.prisma.appUser.findUnique({ where: { dni: dto.dni } });
    if (!user) throw new BadRequestException('DNI sin usuario');
    const token = randomBytes(24).toString('hex');
    await this.repo.prisma.accessRecovery.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60_000) }
    });
    return { token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const recovery = await this.repo.prisma.accessRecovery.findUnique({ where: { token: dto.token } });
    if (!recovery || recovery.expiresAt < new Date() || recovery.consumedAt) {
      throw new UnauthorizedException('Token de recuperación inválido');
    }
    await this.repo.prisma.authCredential.upsert({
      where: { userId: recovery.userId },
      update: { passwordHash: this.hashPassword(dto.newPassword), passwordUpdated: new Date() },
      create: { userId: recovery.userId, passwordHash: this.hashPassword(dto.newPassword) }
    });
    await this.repo.prisma.accessRecovery.update({ where: { id: recovery.id }, data: { consumedAt: new Date() } });
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
