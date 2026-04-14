import { NextResponse } from 'next/server';

import { getCurrentOperator } from '../../../../../lib/auth';
import { recordsByModule } from '../../../../../lib/mock-admin-data';
import { ModuleKey } from '../../../../../lib/admin-types';

const hasModule = (value: string): value is ModuleKey => value in recordsByModule;

const toCsv = (module: ModuleKey) => {
  const headers = ['id', 'estado', 'cobertura', 'profesional', 'paciente', 'detalle'];
  const rows = recordsByModule[module].map((record) =>
    [record.id, record.estado, record.cobertura, record.profesional, record.paciente, record.detalle].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
};

export async function GET(request: Request, { params }: { params: { module: string } }) {
  const operator = getCurrentOperator();
  if (!operator) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  if (!hasModule(params.module)) {
    return NextResponse.json({ message: 'Módulo inexistente' }, { status: 404 });
  }

  const permission = operator.permissions.find((entry) => entry.module === params.module);
  if (!permission?.canExport) {
    return NextResponse.json({ message: 'Sin permisos para exportar' }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const csvContent = toCsv(params.module);
  const fileName = `${params.module}-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
