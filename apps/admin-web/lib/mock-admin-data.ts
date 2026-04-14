import { AdminRecord, HistoryEvent, ModuleKey, Operator } from './admin-types';

const ALL_ACTIONS = ['cancelar', 'reprogramar', 'devolver', 'publicar'] as const;

const moduleSeed: Record<ModuleKey, { prefix: string; estados: string[]; detalle: string[] }> = {
  profesionales: {
    prefix: 'PR',
    estados: ['Activo', 'Pendiente', 'Suspendido'],
    detalle: ['Alta de profesional', 'Actualización de matrícula', 'Bloqueo por documentación'],
  },
  agendas: {
    prefix: 'AG',
    estados: ['Abierta', 'Bloqueada', 'Revisión'],
    detalle: ['Disponibilidad semanal', 'Hueco de agenda', 'Conflicto de turnos'],
  },
  cobertura: {
    prefix: 'CO',
    estados: ['Activa', 'Vencida', 'Observada'],
    detalle: ['Regla de copago', 'Validación de plan', 'Cobertura parcial'],
  },
  pagos: {
    prefix: 'PG',
    estados: ['Pendiente', 'Acreditado', 'Rechazado'],
    detalle: ['Pago de prestación', 'Reembolso paciente', 'Devolución por no-show'],
  },
  documentos: {
    prefix: 'DC',
    estados: ['Publicado', 'Borrador', 'Observado'],
    detalle: ['Consentimiento informado', 'Receta electrónica', 'Adjunto de orden'],
  },
  auditoria: {
    prefix: 'AU',
    estados: ['INFO', 'WARN', 'ALERT'],
    detalle: ['Cambio de estado', 'Intervención de operador', 'Acceso fuera de horario'],
  },
  parametros: {
    prefix: 'PA',
    estados: ['Vigente', 'Pendiente', 'Inactivo'],
    detalle: ['Parámetro global', 'Regla de asignación', 'Ventana operativa'],
  },
};

const createModuleRecords = (module: ModuleKey): AdminRecord[] => {
  const seed = moduleSeed[module];
  return Array.from({ length: 24 }).map((_, idx) => {
    const serial = idx + 1;
    return {
      id: `${seed.prefix}-${String(serial).padStart(4, '0')}`,
      module,
      estado: seed.estados[idx % seed.estados.length],
      cobertura: ['OSDE 210', 'Swiss Medical', 'IOMA', 'Particular'][idx % 4],
      profesional: ['Dra. Gómez', 'Dr. Luna', 'Dra. Rey', 'Dr. Díaz'][idx % 4],
      paciente: ['María Soto', 'Juan Pérez', 'Ana Ruiz', 'Carlos Díaz'][idx % 4],
      fecha: new Date(Date.now() - idx * 1000 * 60 * 60 * 14).toISOString(),
      detalle: seed.detalle[idx % seed.detalle.length],
      allowedActions: ALL_ACTIONS.filter((_, actionIdx) => (idx + actionIdx) % 2 === 0),
    };
  });
};

export const recordsByModule: Record<ModuleKey, AdminRecord[]> = {
  profesionales: createModuleRecords('profesionales'),
  agendas: createModuleRecords('agendas'),
  cobertura: createModuleRecords('cobertura'),
  pagos: createModuleRecords('pagos'),
  documentos: createModuleRecords('documentos'),
  auditoria: createModuleRecords('auditoria'),
  parametros: createModuleRecords('parametros'),
};

export const historyByRecord: Record<string, HistoryEvent[]> = Object.values(recordsByModule)
  .flat()
  .reduce<Record<string, HistoryEvent[]>>((acc, record) => {
    acc[record.id] = Array.from({ length: 4 }).map((_, index) => ({
      id: `${record.id}-H${index + 1}`,
      recordId: record.id,
      date: new Date(new Date(record.fecha).getTime() + index * 1000 * 60 * 60).toISOString(),
      actor: ['ops.1', 'ops.2', 'auditor.1'][index % 3],
      change: ['Creación', 'Cambio de estado', 'Intervención manual', 'Exportación'][index],
    }));
    return acc;
  }, {});

export const operators: Array<{ username: string; password: string; operator: Operator }> = [
  {
    username: 'superadmin',
    password: 'admin123',
    operator: {
      id: 'op-001',
      name: 'Ana Superadmin',
      role: 'SuperAdmin',
      permissions: [
        {
          module: 'profesionales',
          rf: ['RF-064', 'RF-065'],
          actions: ['cancelar', 'reprogramar', 'publicar'],
          canExport: true,
        },
        { module: 'agendas', rf: ['RF-066', 'RF-067'], actions: ['cancelar', 'reprogramar'], canExport: true },
        { module: 'cobertura', rf: ['RF-068', 'RF-069'], actions: ['publicar'], canExport: true },
        { module: 'pagos', rf: ['RF-070', 'RF-071'], actions: ['devolver', 'cancelar'], canExport: true },
        { module: 'documentos', rf: ['RF-072', 'RF-073'], actions: ['publicar', 'cancelar'], canExport: true },
        { module: 'auditoria', rf: ['RF-074', 'RF-075'], actions: [], canExport: true },
        { module: 'parametros', rf: ['RF-076', 'RF-077'], actions: ['publicar'], canExport: true },
      ],
    },
  },
  {
    username: 'operador',
    password: 'operador123',
    operator: {
      id: 'op-010',
      name: 'Luis Operador',
      role: 'Operaciones',
      permissions: [
        {
          module: 'profesionales',
          rf: ['RF-064', 'RF-065'],
          actions: ['cancelar', 'reprogramar'],
          canExport: false,
        },
        { module: 'agendas', rf: ['RF-066', 'RF-067'], actions: ['cancelar', 'reprogramar'], canExport: false },
        { module: 'pagos', rf: ['RF-070', 'RF-071'], actions: ['devolver'], canExport: false },
      ],
    },
  },
];

export const findOperatorByCredentials = (username: string, password: string) =>
  operators.find((entry) => entry.username === username && entry.password === password)?.operator;

export const findOperatorById = (id: string) => operators.find((entry) => entry.operator.id === id)?.operator;
