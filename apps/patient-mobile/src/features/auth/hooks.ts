import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from './api';
import { useSession } from '../../session/SessionProvider';

export const useRegister = () => useMutation({ mutationFn: authApi.register });

export const useVerifyOtp = () => useMutation({ mutationFn: authApi.verifyOtp });

export const useLogin = () => {
  const session = useSession();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ tokens, session: loginSession }) => {
      await session.setAuth(tokens, loginSession);
      await authApi.auditEvent({ event: 'LOGIN', deviceId: loginSession.deviceId });
    },
    onError: async () => {
      await authApi.auditEvent({ event: 'LOGIN_FAILED', deviceId: session.deviceId, metadata: { reason: 'credentials_or_otp_required' } });
    },
  });
};

export const useDevices = (enabled: boolean) => useQuery({ queryKey: ['auth', 'devices'], queryFn: authApi.listDevices, enabled });

export const useActiveSessions = (enabled: boolean) =>
  useQuery({ queryKey: ['auth', 'active-sessions'], queryFn: authApi.listActiveSessions, enabled });

export const useLogoutDevice = () => {
  const session = useSession();
  return useMutation({
    mutationFn: authApi.logoutDevice,
    onSuccess: async (_, variables) => {
      await authApi.auditEvent({ event: 'LOGOUT', deviceId: variables.deviceId });
    },
    onError: async () => {
      await authApi.auditEvent({ event: 'LOGOUT', deviceId: session.deviceId, metadata: { reason: 'logout_failed' } });
    },
  });
};

export const useRevokeSession = () => {
  const session = useSession();
  return useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: async () => {
      await authApi.auditEvent({ event: 'SESSION_REVOKED', deviceId: session.deviceId });
    },
  });
};
