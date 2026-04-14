import { NextResponse } from 'next/server';

import { getCurrentOperator } from '../../../lib/auth';

export async function GET() {
  const operator = getCurrentOperator();
  if (!operator) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({ operator });
}
