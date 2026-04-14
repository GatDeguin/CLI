export type ModuleKey =
  | 'profesionales'
  | 'agendas'
  | 'cobertura'
  | 'pagos'
  | 'documentos'
  | 'auditoria'
  | 'parametros';

export type InterventionAction = 'cancelar' | 'reprogramar' | 'devolver' | 'publicar';

export type RfCode =
  | 'RF-064'
  | 'RF-065'
  | 'RF-066'
  | 'RF-067'
  | 'RF-068'
  | 'RF-069'
  | 'RF-070'
  | 'RF-071'
  | 'RF-072'
  | 'RF-073'
  | 'RF-074'
  | 'RF-075'
  | 'RF-076'
  | 'RF-077';

export type ModulePermission = {
  module: ModuleKey;
  rf: RfCode[];
  actions: InterventionAction[];
  canExport: boolean;
};

export type Operator = {
  id: string;
  name: string;
  role: string;
  permissions: ModulePermission[];
};

export type AdminRecord = {
  id: string;
  module: ModuleKey;
  estado: string;
  cobertura: string;
  profesional: string;
  paciente: string;
  fecha: string;
  detalle: string;
  allowedActions: InterventionAction[];
};

export type HistoryEvent = {
  id: string;
  recordId: string;
  date: string;
  actor: string;
  change: string;
};

export type RecordListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AdminRecord[];
};
