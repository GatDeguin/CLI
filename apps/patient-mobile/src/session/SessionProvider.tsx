import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { secureStorage } from '../api/storage';
import { SessionInfo, Tokens } from '../api/types';
import { biometrics } from './biometrics';

type SessionState = {
  tokens: Tokens | null;
  session: SessionInfo | null;
  deviceId: string;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  isBiometricLocked: boolean;
  biometricError: string | null;
  activeProfileId: string | null;
  setAuth: (tokens: Tokens, session: SessionInfo) => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [deviceId, setDeviceId] = useState('device-mobile-ar');
  const [isBiometricAvailable, setBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricLocked, setBiometricLocked] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      secureStorage.getStoredTokens(),
      secureStorage.getSession(),
      secureStorage.getOrCreateDeviceId(),
      secureStorage.isBiometricEnabled(),
      biometrics.isAvailable(),
    ]).then(([storedAuth, storedSession, storedDeviceId, biometricEnabled, biometricAvailable]) => {
      setTokens(storedAuth?.tokens ?? null);
      setSession(storedSession as SessionInfo | null);
      setDeviceId(storedAuth?.deviceId ?? storedDeviceId);
      setBiometricEnabled(biometricEnabled);
      setBiometricAvailable(biometricAvailable);
      setBiometricLocked(Boolean(storedAuth?.tokens) && biometricEnabled && biometricAvailable);
    });
  }, []);

  const value = useMemo<SessionState>(() => ({
    tokens,
    session,
    deviceId,
    isBiometricAvailable,
    isBiometricEnabled,
    isBiometricLocked,
    biometricError,
    activeProfileId: session?.activeProfileId ?? null,
    setAuth: async (nextTokens, nextSession) => {
      await Promise.all([secureStorage.setTokens(nextTokens, nextSession.deviceId), secureStorage.setSession(nextSession)]);
      setTokens(nextTokens);
      setSession(nextSession);
      setDeviceId(nextSession.deviceId);
      setBiometricLocked(false);
      setBiometricError(null);
    },
    setActiveProfile: async (profileId) => {
      if (!session) return;
      const next = { ...session, activeProfileId: profileId };
      await secureStorage.setSession(next);
      setSession(next);
    },
    unlockWithBiometrics: async () => {
      if (!isBiometricAvailable || !isBiometricEnabled) return false;
      const result = await biometrics.authenticate();
      if (result.success) {
        setBiometricLocked(false);
        setBiometricError(null);
        return true;
      }
      setBiometricError('No se pudo validar biometría. Podés continuar con OTP o contraseña.');
      return false;
    },
    setBiometricPreference: async (enabled) => {
      await secureStorage.setBiometricEnabled(enabled);
      setBiometricEnabled(enabled);
      if (!enabled) {
        setBiometricLocked(false);
        setBiometricError(null);
      }
    },
    clearSession: async () => {
      await secureStorage.clear();
      setTokens(null);
      setSession(null);
      setBiometricLocked(false);
      setBiometricError(null);
    },
  }), [tokens, session, deviceId, isBiometricAvailable, isBiometricEnabled, isBiometricLocked, biometricError]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider missing');
  return context;
};
