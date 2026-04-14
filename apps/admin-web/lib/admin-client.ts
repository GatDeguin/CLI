import { AdminRecord, HistoryEvent, InterventionAction, ModuleKey, Operator, RecordListResponse } from './admin-types';
import { historyByRecord, recordsByModule } from './mock-admin-data';

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/$/, '');
const PUBLIC_API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000');
const MOCK_FLAG = (process.env.NEXT_PUBLIC_ENABLE_ADMIN_MOCK ?? 'false').toLowerCase() === 'true';
const canUseMock = () => MOCK_FLAG && process.env.NODE_ENV === 'development';

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let currentOperator: Operator | null = null;

const ensureBrowser = () => typeof window !== 'undefined';
const hasModule = (value: string): value is ModuleKey => value in recordsByModule;

const buildApiUrl = (path: string) => `${PUBLIC_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

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
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
};

const refreshSession = async (): Promise<boolean> => {
  try {
    const payload = await fetchJson<{ accessToken: string | null; expiresInSeconds?: number; operator?: Operator }>(
      '/admin/auth/refresh',
      { method: 'POST' }
    );
    if (!payload.accessToken || !payload.expiresInSeconds || !payload.operator) {
      accessToken = null;
      accessTokenExpiresAt = 0;
      currentOperator = null;
      return false;
    }

    accessToken = payload.accessToken;
    accessTokenExpiresAt = Date.now() + payload.expiresInSeconds * 1000;
    currentOperator = payload.operator;
    return true;
  } catch {
    accessToken = null;
    accessTokenExpiresAt = 0;
    currentOperator = null;
    return false;
  }
};

const ensureAccessToken = async () => {
  if (canUseMock()) {
    return null;
  }
  if (accessToken && Date.now() < accessTokenExpiresAt - 10_000) {
    return accessToken;
  }
  await refreshSession();
  return accessToken;
};

const fetchApi = async <T>(path: string, init?: RequestInit, retry = true): Promise<T> => {
  const token = await ensureAccessToken();
  const response = await fetch(buildApiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return fetchApi(path, init, false);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
};

export const getCurrentOperator = async (): Promise<Operator | null> => {
  if (!ensureBrowser()) {
    return null;
  }

  if (canUseMock()) {
    return null;
  }

  if (currentOperator) {
    return currentOperator;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    return null;
  }

  return currentOperator;
};

export const login = async (username: string, password: string): Promise<Operator | null> => {
  if (canUseMock()) {
    return null;
  }

  const payload = await fetchJson<{ accessToken: string; expiresInSeconds: number; operator: Operator }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, deviceId: 'admin-web' })
  });

  accessToken = payload.accessToken;
  accessTokenExpiresAt = Date.now() + payload.expiresInSeconds * 1000;
  currentOperator = payload.operator;
  return payload.operator;
};

export const logout = async () => {
  accessToken = null;
  accessTokenExpiresAt = 0;
  currentOperator = null;

  if (!ensureBrowser()) {
    return;
  }

  if (canUseMock()) {
    return;
  }

  await fetchJson('/admin/auth/logout', { method: 'POST' }).catch(() => null);
};

export const getModuleRecords = async ({
  module,
  q,
  status,
  page,
  pageSize
}: {
  module: string;
  q: string;
  status: string;
  page: number;
  pageSize: number;
  operator: Operator;
}): Promise<RecordListResponse> => {
  if (!canUseMock()) {
    return fetchApi<RecordListResponse>(
      `/admin/modules/${module}/records?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`
    );
  }

  if (!hasModule(module)) {
    return { page, pageSize, total: 0, items: [] };
  }

  const filtered = recordsByModule[module].filter((record) => {
    const matchesQ = !q || Object.values(record).join(' ').toLowerCase().includes(q.toLowerCase());
    const matchesStatus = status === 'Todos' || record.estado === status;
    return matchesQ && matchesStatus;
  });

  return {
    page,
    pageSize,
    total: filtered.length,
    items: filtered.slice((page - 1) * pageSize, page * pageSize)
  };
};

export const getRecordHistory = async ({ module, recordId }: { module: string; recordId: string; operator: Operator }): Promise<HistoryEvent[]> => {
  if (!canUseMock()) {
    return fetchApi<HistoryEvent[]>(`/admin/modules/${module}/records/${recordId}/history`);
  }
  return hasModule(module) ? (historyByRecord[recordId] ?? []) : [];
};

export const interveneRecord = async ({
  module,
  record,
  action
}: {
  module: string;
  record: AdminRecord;
  action: InterventionAction;
  operator: Operator;
}): Promise<HistoryEvent[]> => {
  if (!canUseMock()) {
    return fetchApi<HistoryEvent[]>(`/admin/modules/${module}/records/${record.id}/interventions`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  historyByRecord[record.id] = [
    {
      id: `${record.id}-H${Date.now()}`,
      recordId: record.id,
      date: new Date().toISOString(),
      actor: 'mock-operator',
      change: `Intervención: ${action}`
    },
    ...(historyByRecord[record.id] ?? [])
  ];
  return historyByRecord[record.id];
};

export const exportModuleFile = async ({ module, format }: { module: string; format: 'csv' | 'xlsx'; operator: Operator }): Promise<Blob | null> => {
  if (!canUseMock()) {
    const payload = await fetchApi<{ data: string; contentType: string }>(`/admin/modules/${module}/export?format=${format}`);
    return new Blob([payload.data], { type: payload.contentType });
  }

  if (!hasModule(module)) {
    return null;
  }

  const headers = ['id', 'estado', 'cobertura', 'profesional', 'paciente', 'detalle'];
  const rows = recordsByModule[module].map((record) =>
    [record.id, record.estado, record.cobertura, record.profesional, record.paciente, record.detalle].join(',')
  );
  return new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv; charset=utf-8' });
};
