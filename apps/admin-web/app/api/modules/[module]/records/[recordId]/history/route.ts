import { NextResponse } from 'next/server';

import { getCurrentOperator } from '../../../../../../../lib/auth';
import { historyByRecord, recordsByModule } from '../../../../../../../lib/mock-admin-data';
import { ModuleKey } from '../../../../../../../lib/admin-types';

const hasModule = (value: string): value is ModuleKey => value in recordsByModule;

export async function GET(_: Request, { params }: { params: { module: string; recordId: string } }) {
  const operator = getCurrentOperator();
  if (!operator) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  if (!hasModule(params.module)) {
    return NextResponse.json({ message: 'Módulo inexistente' }, { status: 404 });
  }

  const permission = operator.permissions.find((entry) => entry.module === params.module);
  if (!permission) {
    return NextResponse.json({ message: 'Sin permisos para este módulo' }, { status: 403 });
  }

  return NextResponse.json({ items: historyByRecord[params.recordId] ?? [] });
}
