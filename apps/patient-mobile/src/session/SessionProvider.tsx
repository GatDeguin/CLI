import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { secureStorage } from '../api/storage';
import { SessionInfo, Tokens } from '../api/types';

type SessionState = {
  tokens: Tokens | null;
  session: SessionInfo | null;
  activeProfileId: string | null;
  setAuth: (tokens: Tokens, session: SessionInfo) => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    Promise.all([secureStorage.getTokens(), secureStorage.getSession()]).then(([storedTokens, storedSession]) => {
      setTokens(storedTokens);
      setSession(storedSession as SessionInfo | null);
    });
  }, []);

  const value = useMemo<SessionState>(() => ({
    tokens,
    session,
    activeProfileId: session?.activeProfileId ?? null,
    setAuth: async (nextTokens, nextSession) => {
      await Promise.all([secureStorage.setTokens(nextTokens), secureStorage.setSession(nextSession)]);
      setTokens(nextTokens);
      setSession(nextSession);
    },
    setActiveProfile: async (profileId) => {
      if (!session) return;
      const next = { ...session, activeProfileId: profileId };
      await secureStorage.setSession(next);
      setSession(next);
    },
    clearSession: async () => {
      await secureStorage.clear();
      setTokens(null);
      setSession(null);
    },
  }), [tokens, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider missing');
  return context;
};
