import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

export interface AuthTokenPayload {
  sub: string;
  dni: string;
  role: string;
  exp: number;
}

@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET ?? 'dev-secret';
  private readonly ttlSeconds = Number(process.env.JWT_TTL_SECONDS ?? 3600);

  sign(subject: { id: string; dni: string; role: string }): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: subject.id,
      dni: subject.dni,
      role: subject.role,
      exp: Math.floor(Date.now() / 1000) + this.ttlSeconds
    });
    const signature = this.signRaw(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
  }

  verify(token: string): AuthTokenPayload {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) throw new UnauthorizedException('Token JWT inválido');
    const expected = this.signRaw(`${header}.${payload}`);
    if (expected !== signature) throw new UnauthorizedException('Firma JWT inválida');
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (body.exp <= Math.floor(Date.now() / 1000)) throw new UnauthorizedException('JWT expirado');
    return body;
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private signRaw(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
