import * as SecureStore from 'expo-secure-store';
import { Tokens } from './types';

const TOKENS_KEY = 'patient-mobile.tokens';
const SESSION_KEY = 'patient-mobile.session';
const DEVICE_ID_KEY = 'patient-mobile.device-id';
const BIOMETRIC_ENABLED_KEY = 'patient-mobile.biometric-enabled';

type StoredTokens = { deviceId: string; tokens: Tokens };

const randomDeviceId = () => `pm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const secureStorage = {
  async getTokens(): Promise<Tokens | null> {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Tokens | StoredTokens;
    return 'tokens' in parsed ? parsed.tokens : parsed;
  },
  async setTokens(tokens: Tokens | null, deviceId?: string) {
    if (!tokens) return SecureStore.deleteItemAsync(TOKENS_KEY);
    const effectiveDeviceId = deviceId ?? await secureStorage.getOrCreateDeviceId();
    return SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify({ deviceId: effectiveDeviceId, tokens } satisfies StoredTokens));
  },
  async getStoredTokens(): Promise<StoredTokens | null> {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Tokens | StoredTokens;
    if ('tokens' in parsed) return parsed;
    const deviceId = await secureStorage.getOrCreateDeviceId();
    return { deviceId, tokens: parsed };
  },
  async getOrCreateDeviceId(): Promise<string> {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) return stored;
    const next = randomDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, next);
    return next;
  },
  async setBiometricEnabled(enabled: boolean) {
    return SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0');
  },
  async isBiometricEnabled() {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === '1';
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
    await Promise.all([SecureStore.deleteItemAsync(TOKENS_KEY), SecureStore.deleteItemAsync(SESSION_KEY), SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY)]);
  },
};
