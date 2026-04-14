import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from './api';
import { useSession } from '../../session/SessionProvider';

export const useRegister = () => useMutation({ mutationFn: authApi.register });

export const useVerifyOtp = () => useMutation({ mutationFn: authApi.verifyOtp });

export const useLogin = () => {
  const session = useSession();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ tokens, session: loginSession }) => session.setAuth(tokens, loginSession),
  });
};

export const useDevices = (enabled: boolean) => useQuery({ queryKey: ['auth', 'devices'], queryFn: authApi.listDevices, enabled });

export const useLogoutDevice = () => useMutation({ mutationFn: authApi.logoutDevice });
