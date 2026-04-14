export const ADMIN_MODULES = [
  'profesionales',
  'agendas',
  'cobertura',
  'pagos',
  'documentos',
  'auditoria',
  'parametros'
] as const;

export type AdminModuleKey = (typeof ADMIN_MODULES)[number];

export type InterventionAction = 'cancelar' | 'reprogramar' | 'devolver' | 'publicar';

export type ModulePermission = {
  module: AdminModuleKey;
  rf: string[];
  actions: InterventionAction[];
  canExport: boolean;
};

export type AppRole = 'ADMIN' | 'USER' | 'AUDITOR';

const permissionsByRole: Record<AppRole, ModulePermission[]> = {
  ADMIN: [
    { module: 'profesionales', rf: ['RF-064', 'RF-065'], actions: ['cancelar', 'reprogramar', 'publicar'], canExport: true },
    { module: 'agendas', rf: ['RF-066', 'RF-067'], actions: ['cancelar', 'reprogramar'], canExport: true },
    { module: 'cobertura', rf: ['RF-068', 'RF-069'], actions: ['publicar'], canExport: true },
    { module: 'pagos', rf: ['RF-070', 'RF-071'], actions: ['devolver', 'cancelar'], canExport: true },
    { module: 'documentos', rf: ['RF-072', 'RF-073'], actions: ['publicar', 'cancelar'], canExport: true },
    { module: 'auditoria', rf: ['RF-074', 'RF-075'], actions: [], canExport: true },
    { module: 'parametros', rf: ['RF-076', 'RF-077'], actions: ['publicar'], canExport: true }
  ],
  USER: [
    { module: 'profesionales', rf: ['RF-064', 'RF-065'], actions: ['cancelar', 'reprogramar'], canExport: false },
    { module: 'agendas', rf: ['RF-066', 'RF-067'], actions: ['cancelar', 'reprogramar'], canExport: false },
    { module: 'pagos', rf: ['RF-070', 'RF-071'], actions: ['devolver'], canExport: false }
  ],
  AUDITOR: [
    { module: 'auditoria', rf: ['RF-074', 'RF-075'], actions: [], canExport: true },
    { module: 'documentos', rf: ['RF-072', 'RF-073'], actions: [], canExport: true }
  ]
};

export const getPermissionsForRole = (role: AppRole): ModulePermission[] => permissionsByRole[role] ?? [];


export const getModulePermission = (role: AppRole, module: string): ModulePermission | undefined =>
  getPermissionsForRole(role).find((entry) => entry.module === module);
