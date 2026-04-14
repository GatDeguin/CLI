import { NextResponse } from 'next/server';

import { getCurrentOperator } from '../../../../../../../lib/auth';
import { historyByRecord, recordsByModule } from '../../../../../../../lib/mock-admin-data';
import { InterventionAction, ModuleKey } from '../../../../../../../lib/admin-types';

const hasModule = (value: string): value is ModuleKey => value in recordsByModule;

export async function POST(request: Request, { params }: { params: { module: string; recordId: string } }) {
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

  const body = (await request.json()) as { action?: InterventionAction };
  if (!body.action || !permission.actions.includes(body.action)) {
    return NextResponse.json({ message: 'Acción no permitida' }, { status: 403 });
  }

  historyByRecord[params.recordId] = [
    {
      id: `${params.recordId}-H${Date.now()}`,
      recordId: params.recordId,
      date: new Date().toISOString(),
      actor: operator.name,
      change: `Intervención: ${body.action}`,
    },
    ...(historyByRecord[params.recordId] ?? []),
  ];

  return NextResponse.json({ ok: true });
}
