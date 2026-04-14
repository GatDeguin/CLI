import { AdminRecord, HistoryEvent, InterventionAction, ModuleKey, Operator, RecordListResponse } from './admin-types';
import { findOperatorByCredentials, findOperatorById, historyByRecord, recordsByModule } from './mock-admin-data';

const SESSION_STORAGE_KEY = 'admin_operator_session';

const hasModule = (value: string): value is ModuleKey => value in recordsByModule;

const cloneRecord = (record: AdminRecord): AdminRecord => ({
  ...record,
  allowedActions: [...record.allowedActions],
});

const cloneHistory = (event: HistoryEvent): HistoryEvent => ({ ...event });

const toCsv = (module: ModuleKey) => {
  const headers = ['id', 'estado', 'cobertura', 'profesional', 'paciente', 'detalle'];
  const rows = recordsByModule[module].map((record) =>
    [record.id, record.estado, record.cobertura, record.profesional, record.paciente, record.detalle].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
};

const ensureBrowser = () => typeof window !== 'undefined';

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/$/, '');

const PUBLIC_API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? '');

const hasApiBaseUrl = () => PUBLIC_API_BASE_URL.length > 0;

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_API_BASE_URL}${normalizedPath}`;
};

const parseError = async (response: Response) => {
  try {
    const payload = await response.json();
    return payload?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
};

export const getCurrentOperator = (): Operator | null => {
  if (!ensureBrowser()) {
    return null;
  }

  const operatorId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!operatorId) {
    return null;
  }

  return findOperatorById(operatorId) ?? null;
};

export const login = (username: string, password: string): Operator | null => {
  const operator = findOperatorByCredentials(username, password) ?? null;
  if (!operator || !ensureBrowser()) {
    return operator;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, operator.id);
  return operator;
};

export const logout = () => {
  if (!ensureBrowser()) {
    return;
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getModuleRecords = async ({
  module,
  q,
  status,
  page,
  pageSize,
  operator,
}: {
  module: string;
  q: string;
  status: string;
  page: number;
  pageSize: number;
  operator: Operator;
}): Promise<RecordListResponse> => {
  if (hasApiBaseUrl()) {
    return fetchJson<RecordListResponse>(
      `/admin/modules/${module}/records?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'X-Operator-Id': operator.id,
        },
      },
    );
  }

  if (!hasModule(module)) {
    return { page, pageSize, total: 0, items: [] };
  }

  const permission = operator.permissions.find((entry) => entry.module === module);
  if (!permission) {
    return { page, pageSize, total: 0, items: [] };
  }

  const search = q.trim().toLowerCase();

  const filtered = recordsByModule[module].filter((record) => {
    const matchesQ = !search || Object.values(record).join(' ').toLowerCase().includes(search);
    const matchesStatus = status === 'Todos' || record.estado === status;
    return matchesQ && matchesStatus;
  });

  const items = filtered.slice((page - 1) * pageSize, page * pageSize).map((record) => ({
    ...cloneRecord(record),
    allowedActions: record.allowedActions.filter((action) => permission.actions.includes(action)),
  }));

  return {
    page,
    pageSize,
    total: filtered.length,
    items,
  };
};

export const getRecordHistory = async ({ module, recordId, operator }: { module: string; recordId: string; operator: Operator }): Promise<HistoryEvent[]> => {
  if (hasApiBaseUrl()) {
    return fetchJson<HistoryEvent[]>(`/admin/modules/${module}/records/${recordId}/history`, {
      headers: {
        'X-Operator-Id': operator.id,
      },
    });
  }

  if (!hasModule(module) || !operator.permissions.find((entry) => entry.module === module)) {
    return [];
  }

  return (historyByRecord[recordId] ?? []).map(cloneHistory);
};

export const interveneRecord = async ({
  module,
  record,
  action,
  operator,
}: {
  module: string;
  record: AdminRecord;
  action: InterventionAction;
  operator: Operator;
}): Promise<HistoryEvent[]> => {
  if (hasApiBaseUrl()) {
    return fetchJson<HistoryEvent[]>(`/admin/modules/${module}/records/${record.id}/interventions`, {
      method: 'POST',
      headers: {
        'X-Operator-Id': operator.id,
      },
      body: JSON.stringify({ action }),
    });
  }

  if (!hasModule(module)) {
    return [];
  }

  const permission = operator.permissions.find((entry) => entry.module === module);
  if (!permission || !permission.actions.includes(action)) {
    return getRecordHistory({ module, recordId: record.id, operator });
  }

  historyByRecord[record.id] = [
    {
      id: `${record.id}-H${Date.now()}`,
      recordId: record.id,
      date: new Date().toISOString(),
      actor: operator.name,
      change: `Intervención: ${action}`,
    },
    ...(historyByRecord[record.id] ?? []),
  ];

  return getRecordHistory({ module, recordId: record.id, operator });
};

export const exportModuleFile = async ({ module, format, operator }: { module: string; format: 'csv' | 'xlsx'; operator: Operator }): Promise<Blob | null> => {
  if (hasApiBaseUrl()) {
    const response = await fetch(buildApiUrl(`/admin/modules/${module}/export?format=${format}`), {
      headers: {
        'X-Operator-Id': operator.id,
      },
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return response.blob();
  }

  if (!hasModule(module)) {
    return null;
  }

  const permission = operator.permissions.find((entry) => entry.module === module);
  if (!permission?.canExport) {
    return null;
  }

  const csvContent = toCsv(module);
  const mimeType =
    format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return new Blob([csvContent], { type: mimeType });
};
