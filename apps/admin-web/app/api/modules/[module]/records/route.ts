import { NextResponse } from 'next/server';

import { getCurrentOperator } from '../../../../../lib/auth';
import { recordsByModule } from '../../../../../lib/mock-admin-data';
import { AdminRecord, ModuleKey } from '../../../../../lib/admin-types';

const hasModule = (value: string): value is ModuleKey => value in recordsByModule;

export async function GET(request: Request, { params }: { params: { module: string } }) {
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

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').toLowerCase();
  const status = url.searchParams.get('status') ?? 'Todos';
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '8');

  const filtered = recordsByModule[params.module].filter((record) => {
    const matchesQ = !q || Object.values(record).join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'Todos' || record.estado === status;
    return matchesQ && matchesStatus;
  });

  const items = filtered.slice((page - 1) * pageSize, page * pageSize).map<AdminRecord>((record) => ({
    ...record,
    allowedActions: record.allowedActions.filter((action) => permission.actions.includes(action)),
  }));

  return NextResponse.json({
    page,
    pageSize,
    total: filtered.length,
    items,
  });
}
