import { apiClient } from '../../api/client';
import { SessionInfo, Tokens } from '../../api/types';

export const authApi = {
  register: (payload: { email: string; dni: string; password: string }) =>
    apiClient<{ userId: string }>('/auth/register', { method: 'POST', auth: false, body: JSON.stringify(payload) }),
  verifyOtp: (payload: { userId: string; otp: string }) =>
    apiClient<{ verified: boolean }>('/auth/otp/verify', { method: 'POST', auth: false, body: JSON.stringify(payload) }),
  login: (payload: { identifier: string; password: string; deviceId: string }) =>
    apiClient<{ tokens: Tokens; session: SessionInfo }>('/auth/login', { method: 'POST', auth: false, body: JSON.stringify(payload) }),
  logoutDevice: (payload: { deviceId: string }) =>
    apiClient<{ ok: true }>('/auth/sessions/logout-device', { method: 'POST', body: JSON.stringify(payload) }),
  listDevices: () => apiClient<Array<{ deviceId: string; lastSeenAt: string; current: boolean }>>('/auth/sessions/devices'),
};
