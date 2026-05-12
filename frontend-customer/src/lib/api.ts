// Lightweight API-Client mit Auto-Refresh.
// Speichert Tokens in localStorage. (Für Production: HTTP-only-Cookies erwägen.)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const ACCESS_KEY = 'lc_access_token';
const REFRESH_KEY = 'lc_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class APIError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new APIError(401, 'no_refresh_token');

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    throw new APIError(res.status, 'refresh_failed');
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // 401 → einmal refreshen, dann erneut versuchen
  if (res.status === 401 && !retried && getRefreshToken()) {
    try {
      await refreshAccessToken();
      return api(path, options, true);
    } catch {
      clearTokens();
      throw new APIError(401, 'unauthenticated');
    }
  }

  if (!res.ok) {
    let code = 'unknown_error';
    try {
      const data = await res.json();
      code = data.error || code;
    } catch {}
    throw new APIError(res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// === Convenience-Endpoints ===

export interface RegisterCreatorInput {
  email: string;
  password: string;
  handle: string;
  display_name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  role: string;
  user_id: string;
}

export async function registerCreator(input: RegisterCreatorInput): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/api/auth/register/creator', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {}
  }
  clearTokens();
}

export async function getMe(): Promise<any> {
  return api('/api/auth/me');
}
