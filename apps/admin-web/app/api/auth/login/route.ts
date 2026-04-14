import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '../../../../lib/auth';
import { findOperatorByCredentials } from '../../../../lib/mock-admin-data';

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const operator = findOperatorByCredentials(body.username ?? '', body.password ?? '');

  if (!operator) {
    return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
  }

  const response = NextResponse.json({ operator });
  response.cookies.set(SESSION_COOKIE, operator.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}
