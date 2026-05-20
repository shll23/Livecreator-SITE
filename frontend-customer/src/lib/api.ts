// Lightweight API-Client mit Auto-Refresh.

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

// === Auth ===

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

// === Wallet ===

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_cents: number;
  currency: string;
}

export async function getWallet(): Promise<{ balance_coins: number }> {
  return api('/api/wallet/');
}

export async function getPackages(): Promise<{ packages: CoinPackage[] }> {
  return api('/api/wallet/packages');
}

export async function getHistory(): Promise<{ history: any[] }> {
  return api('/api/wallet/history');
}

export async function getPurchases(): Promise<{ purchases: any[] }> {
  return api('/api/wallet/purchases');
}

export interface PurchaseResponse {
  purchase_id: string;
  redirect_url: string;
  status: string;
  coins: number;
  price_cents: number;
  currency: string;
}

export async function startPurchase(packageId: string): Promise<PurchaseResponse> {
  return api('/api/wallet/purchase', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  });
}

// === Creators (Public) ===

export interface ProfileData {
  height_cm?: number;
  figure?: string;
  hair_color?: string;
  hair_length?: string;
  eye_color?: string;
  zodiac?: string;
  smoker?: string;
  marital_status?: string;
  tattoos?: string;
  piercings?: string;
  looking_for?: string[];
  turn_ons?: string[];
  interests?: string[];
  about_text?: string;
  [key: string]: any;
}

export interface Creator {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  message_price_coins: number;
  is_verified: boolean;
  age: number | null;
  city: string | null;
  country: string | null;
  gallery_urls: string[];
  profile_data: ProfileData;
  distance_km?: number;
}

export interface CreatorFilters {
  city?: string;
  min_age?: number;
  max_age?: number;
  near_lat?: number;
  near_lng?: number;
  radius_km?: number;
  limit?: number;
}

export async function listCreators(filters: CreatorFilters = {}): Promise<{ creators: Creator[] }> {
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.min_age != null) params.set('min_age', String(filters.min_age));
  if (filters.max_age != null) params.set('max_age', String(filters.max_age));
  if (filters.near_lat != null) params.set('near_lat', String(filters.near_lat));
  if (filters.near_lng != null) params.set('near_lng', String(filters.near_lng));
  if (filters.radius_km != null) params.set('radius_km', String(filters.radius_km));
  if (filters.limit != null) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return api(`/api/creators${qs ? '?' + qs : ''}`);
}

export async function getCreatorByHandle(handle: string): Promise<Creator> {
  return api(`/api/creators/${handle}`);
}

// === Chat / Conversations ===

export interface Conversation {
  id: string;
  peer_id: string;
  peer_name: string;
  peer_handle: string | null;
  peer_avatar: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_blocked: boolean;
}

export interface ConversationDetail {
  id: string;
  creator_user_id: string;
  customer_user_id: string;
  peer_name: string;
  peer_handle: string | null;
  peer_avatar: string | null;
  peer_bio: string | null;
  message_price_coins: number;
  unread_count: number;
  is_blocked: boolean;
}

export interface Message {
  id: string;
  sender_role: 'creator' | 'customer' | 'system';
  sender_id: string;
  msg_type: 'text' | 'media' | 'system_notice';
  body: string | null;
  coin_cost: number;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageResponse {
  id: string;
  sender_role: 'creator' | 'customer';
  sender_id: string;
  body: string;
  coin_cost: number;
  created_at: string;
  balance_coins?: number;
}

export async function getInbox(): Promise<{ conversations: Conversation[] }> {
  return api('/api/conversations/');
}

export async function createConversation(creatorUserId: string): Promise<{ id: string; creator_user_id: string }> {
  return api('/api/conversations/', {
    method: 'POST',
    body: JSON.stringify({ creator_user_id: creatorUserId }),
  });
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  return api(`/api/conversations/${conversationId}`);
}

export async function getMessages(conversationId: string, before?: string): Promise<{ messages: Message[] }> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  return api(`/api/conversations/${conversationId}/messages${qs}`);
}

export async function sendMessage(conversationId: string, body: string): Promise<SendMessageResponse> {
  return api(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  return api(`/api/conversations/${conversationId}/read`, { method: 'POST' });
}

// === Helpers ===

export function formatCents(cents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
