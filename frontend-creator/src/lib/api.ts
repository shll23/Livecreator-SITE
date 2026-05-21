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

// Mutex: nur EIN refresh gleichzeitig.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
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
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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

// === Helpers ===

export function formatCents(cents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

// === Creator-API ===

export interface CreatorStatsPeriod {
  coins: number;
  messages: number;
  cents: number;
}

export interface CreatorStats {
  today: CreatorStatsPeriod;
  week: CreatorStatsPeriod;
  month: CreatorStatsPeriod;
  total: CreatorStatsPeriod;
  current_tier: string;
  tier_percent: number;
  next_tier?: string;
  coins_to_next: number;
}

export async function getCreatorStats(): Promise<CreatorStats> {
  return api<CreatorStats>('/api/creator/stats');
}

// === Chat-API ===

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
  sender_role: 'customer' | 'creator' | 'system';
  sender_id: string;
  msg_type: string;
  body: string;
  coin_cost: number;
  read_at: string | null;
  created_at: string;
}

export interface CustomerInfo {
  customer_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
  lifetime_coins: number;
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
}

export async function getInbox(): Promise<{ conversations: Conversation[] }> {
  return api('/api/conversations/');
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return api(`/api/conversations/${id}`);
}

export async function getMessages(id: string): Promise<{ messages: Message[] }> {
  return api(`/api/conversations/${id}/messages`);
}

export async function sendMessage(
  id: string,
  body: string
): Promise<Message & { balance_coins?: number }> {
  return api(`/api/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function markConversationRead(id: string): Promise<void> {
  await api(`/api/conversations/${id}/read`, { method: 'POST' });
}

export async function getCustomerInfo(customerId: string): Promise<CustomerInfo> {
  return api(`/api/creator/customers/${customerId}`);
}

// === Helpers ===

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHr < 24) return `vor ${diffHr} Std.`;
  if (diffDay === 1) return 'gestern';
  if (diffDay < 7) return `vor ${diffDay} Tagen`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// PROFIL-API (für Creator selbst)
// ============================================================================

export interface MyProfile {
  handle: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  age: number | null;
  latitude: number | null;
  longitude: number | null;
  message_price_coins: number;
  gallery_urls: string[];
  profile_data: ProfileData;
}

export interface ProfileData {
  about_text?: string;
  height_cm?: number;
  figure?: string;
  hair_color?: string;
  hair_length?: string;
  eye_color?: string;
  zodiac?: string;
  smoker?: string;
  tattoos?: string;
  piercings?: string;
  marital_status?: string;
  looking_for?: string[];
  turn_ons?: string[];
  interests?: string[];
  [key: string]: any;
}

export interface ProfilePhoto {
  id: string;
  file_path: string;
  thumb_path: string | null;
  sort_order: number;
  is_primary: boolean;
  status: 'pending_review' | 'approved' | 'rejected';
  rejection_reason: string | null;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  created_at: string;
  reviewed_at: string | null;
}

export async function getMyProfile(): Promise<MyProfile> {
  return api('/api/creator/profile');
}

export async function updateMyProfile(updates: {
  bio?: string;
  profile_data?: ProfileData;
}): Promise<{ updated: boolean }> {
  return api('/api/creator/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function listMyPhotos(): Promise<{ photos: ProfilePhoto[] }> {
  return api('/api/creator/profile/photos');
}

export async function uploadMyPhoto(file: File): Promise<ProfilePhoto> {
  const token = getAccessToken();
  if (!token) throw new APIError(401, 'unauthenticated');

  const formData = new FormData();
  formData.append('photo', file);

  const base = process.env.NEXT_PUBLIC_API_URL || '';
  const res = await fetch(base + '/api/creator/profile/photos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new APIError(res.status, data?.error || 'upload_failed');
  }
  return data as ProfilePhoto;
}

export async function deleteMyPhoto(id: string): Promise<{ deleted: boolean }> {
  return api(`/api/creator/profile/photos/${id}`, { method: 'DELETE' });
}

export async function setMyPrimaryPhoto(id: string): Promise<{ updated: boolean }> {
  return api(`/api/creator/profile/photos/${id}/primary`, { method: 'POST' });
}

export async function reorderMyPhotos(photoIds: string[]): Promise<{ updated: boolean }> {
  return api('/api/creator/profile/photos/reorder', {
    method: 'POST',
    body: JSON.stringify({ photo_ids: photoIds }),
  });
}

// ============================================================================
// PAYOUTS (Auszahlungen)
// ============================================================================

export interface Payout {
  id: string;
  period_year: number;
  period_month: number;
  coins_earned: number;
  messages_count: number;
  amount_cents: number;
  tier_percent: number | null;
  status: 'pending' | 'paid' | 'cancelled';
  has_invoice: boolean;
  paid_at: string;
  created_at: string;
}

export async function listMyPayouts(): Promise<{ payouts: Payout[] }> {
  return api('/api/creator/payouts');
}

export function getInvoiceUrl(payoutId: string): string {
  const token = getAccessToken();
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return `${base}/api/creator/payouts/${payoutId}/invoice?token=${token}`;
}


// ============================================================================
// Heartbeat — alle 60s vom Frontend
// ============================================================================
export async function sendHeartbeat(): Promise<{ ok: boolean; session: string }> {
  return api('/api/auth/heartbeat', { method: 'POST' });
}


// ============================================================================
// PHASE G7: Push-Notifications
// ============================================================================

export async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_URL}/api/notifications/vapid-public-key`);
  if (!res.ok) throw new APIError(res.status, 'no_vapid_key');
  const data = await res.json();
  return data.public_key;
}

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  return api('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  return api('/api/notifications/unsubscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}
