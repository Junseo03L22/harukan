import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Profile } from './model';

export type Snapshot = {
  revision: number; me: Profile; partner: Profile | null;
  connectedAt: number | null; invite: { code: string; expiresAt: number } | null; serverTime: number;
};
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
function serverAddress() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (__DEV__) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') return `http://${window.location.hostname}:8787`;
    const host = Constants.expoConfig?.hostUri;
    if (host) return `http://${new URL(`http://${host}`).hostname}:8787`;
  }
  return null;
}
export const API_URL = serverAddress();
const TOKEN_KEY = 'maeumsai.session.' + Array.from(String(API_URL ?? 'none'), c => c.charCodeAt(0).toString(16)).join('');
let sessionTask: Promise<string> | null = null;
export async function request<T = Snapshot>(path: string, options: { token?: string; method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  if (!API_URL) throw new ApiError('연결 준비가 필요해. 실행 안내를 확인해 줘.', 0);
  const timeout = new AbortController();
  const stop = () => timeout.abort();
  options.signal?.addEventListener('abort', stop, { once: true });
  if (options.signal?.aborted) timeout.abort();
  const timer = setTimeout(stop, path.includes('after=') ? 27000 : 10000);
  try {
    const res = await fetch(API_URL + path, { method: options.method ?? 'GET', signal: timeout.signal,
      headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined });
    const value = await res.json();
    if (!res.ok) throw new ApiError(value.error ?? '연결을 확인해 줘.', res.status);
    return value;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', stop); }
}
export function session(profile: Profile) {
  if (!sessionTask) sessionTask = (async () => {
    const saved = Platform.OS === 'web' ? await AsyncStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
    if (saved) return saved;
    const { token } = await request<{ token: string }>('/v1/session', { method: 'POST', body: { profile } });
    if (Platform.OS === 'web') await AsyncStorage.setItem(TOKEN_KEY, token);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
    return token;
  })().catch(error => { sessionTask = null; throw error; });
  return sessionTask;
}
export function ageLabel(updatedAt: number, now: number) {
  const minutes = Math.floor(Math.max(0, now - updatedAt) / 60000);
  if (minutes < 1) return '방금 바꿈';
  if (minutes < 60) return `${minutes}분 전 바꿈`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전 바꿈`;
  return `${Math.floor(minutes / 1440)}일 전 바꿈`;
}
