import { secureStorage } from './storage';
import { ApiError, Tokens } from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1';

type FetchOptions = RequestInit & { auth?: boolean };

let refreshPromise: Promise<Tokens | null> | null = null;

const parseError = async (res: Response): Promise<ApiError> => {
  let message = `Request failed: ${res.status}`;
  let code: string | undefined;
  try {
    const payload = await res.json();
    message = payload.message ?? message;
    code = payload.code;
  } catch {
    // ignore parse failure
  }
  return { status: res.status, message, code };
};

const refreshTokens = async (): Promise<Tokens | null> => {
  const current = await secureStorage.getTokens();
  if (!current?.refreshToken) return null;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (!response.ok) {
    await secureStorage.clear();
    return null;
  }
  const next = (await response.json()) as Tokens;
  await secureStorage.setTokens(next);
  return next;
};

const getFreshTokens = async () => {
  if (!refreshPromise) refreshPromise = refreshTokens().finally(() => { refreshPromise = null; });
  return refreshPromise;
};

export const apiClient = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(options.headers as Record<string, string> ?? {}) };
  if (options.auth !== false) {
    const tokens = await secureStorage.getTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && options.auth !== false) {
    const refreshed = await getFreshTokens();
    if (refreshed?.accessToken) {
      return apiClient<T>(path, { ...options, headers: { ...(options.headers ?? {}), Authorization: `Bearer ${refreshed.accessToken}` } });
    }
  }
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
};
