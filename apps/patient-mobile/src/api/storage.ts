import * as SecureStore from 'expo-secure-store';
import { Tokens } from './types';

const TOKENS_KEY = 'patient-mobile.tokens';
const SESSION_KEY = 'patient-mobile.session';

export const secureStorage = {
  async getTokens(): Promise<Tokens | null> {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  },
  async setTokens(tokens: Tokens | null) {
    if (!tokens) return SecureStore.deleteItemAsync(TOKENS_KEY);
    return SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  },
  async getSession() {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async setSession(session: unknown) {
    if (!session) return SecureStore.deleteItemAsync(SESSION_KEY);
    return SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  },
  async clear() {
    await Promise.all([SecureStore.deleteItemAsync(TOKENS_KEY), SecureStore.deleteItemAsync(SESSION_KEY)]);
  },
};
