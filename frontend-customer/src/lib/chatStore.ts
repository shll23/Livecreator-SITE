// ============================================================================
// CHAT STORE — Mock-Backend mit LocalStorage
//
// In Session 3 (Backend): Diese Datei wird ersetzt durch echte API-Calls.
// Die Function-Signaturen bleiben gleich — UI muss nicht angepasst werden.
//
// Beispiel-Migration in Session 3:
//   export async function getInbox() {
//     return api<Inbox>('/api/inbox');  // statt localStorage.getItem(...)
//   }
// ============================================================================

import { FRAUEN, getFrauById } from './profileStore';

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  id: string;
  chatId: string;
  sender: 'user' | 'frau';
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Chat {
  id: string;          // = fraId (1 Chat pro Frau)
  fraId: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const KEY_CHATS = 'verliebdich_chats_v1';
const KEY_MESSAGES = 'verliebdich_messages_v1';
const KEY_COINS = 'verliebdich_coins_v1';

// Mock-Wallet Starter-Balance für neue User
const STARTER_COINS = 50;

// ============================================================================
// HELPERS — Storage
// ============================================================================

function loadChats(): Chat[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_CHATS) || '[]');
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_CHATS, JSON.stringify(chats));
}

function loadMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_MESSAGES) || '[]');
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_MESSAGES, JSON.stringify(messages));
}

// ============================================================================
// COIN BALANCE (Mock-Wallet)
// ============================================================================

export function getCoinBalance(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(KEY_COINS);
  if (stored === null) {
    // Neuer User → Starter-Coins
    localStorage.setItem(KEY_COINS, String(STARTER_COINS));
    return STARTER_COINS;
  }
  return Number(stored);
}

export function setCoinBalance(amount: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_COINS, String(Math.max(0, amount)));
  // Event firen damit UI updaten kann
  window.dispatchEvent(new CustomEvent('coins:changed', { detail: amount }));
}

export function deductCoins(amount: number): boolean {
  const current = getCoinBalance();
  if (current < amount) return false;
  setCoinBalance(current - amount);
  return true;
}

export function addCoins(amount: number) {
  setCoinBalance(getCoinBalance() + amount);
}

// ============================================================================
// INBOX — Liste aller Chats des Users
// ============================================================================

export function getInbox(): Chat[] {
  return loadChats().sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

// ============================================================================
// CHAT — Einzelner Chat
// ============================================================================

export function getOrCreateChat(fraId: string): Chat {
  const chats = loadChats();
  const existing = chats.find((c) => c.fraId === fraId);
  if (existing) return existing;

  const frau = getFrauById(fraId);
  if (!frau) throw new Error(`Frau nicht gefunden: ${fraId}`);

  // Neuen Chat erstellen mit Initial-Nachricht von der Frau
  const newChat: Chat = {
    id: fraId,
    fraId,
    lastMessage: frau.initialMessage,
    lastTimestamp: Date.now(),
    unreadCount: 1,
  };
  chats.push(newChat);
  saveChats(chats);

  // Initial-Nachricht von der Frau speichern
  const messages = loadMessages();
  messages.push({
    id: `msg_${Date.now()}_init`,
    chatId: fraId,
    sender: 'frau',
    text: frau.initialMessage,
    timestamp: Date.now(),
    read: false,
  });
  saveMessages(messages);

  return newChat;
}

export function getChatById(chatId: string): Chat | undefined {
  return loadChats().find((c) => c.id === chatId);
}

// ============================================================================
// MESSAGES
// ============================================================================

export function getMessages(chatId: string): Message[] {
  return loadMessages()
    .filter((m) => m.chatId === chatId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function markChatAsRead(chatId: string) {
  // Messages als read markieren
  const messages = loadMessages();
  const updated = messages.map((m) =>
    m.chatId === chatId && m.sender === 'frau' ? { ...m, read: true } : m
  );
  saveMessages(updated);

  // Unread-Count auf 0
  const chats = loadChats();
  const updatedChats = chats.map((c) =>
    c.id === chatId ? { ...c, unreadCount: 0 } : c
  );
  saveChats(updatedChats);
}

// ============================================================================
// SEND MESSAGE — mit Coin-Abbuchung + Mock-Reply
// ============================================================================

export interface SendResult {
  success: boolean;
  error?: 'insufficient_coins' | 'unknown';
  message?: Message;
}

export function sendMessage(chatId: string, text: string): SendResult {
  const frau = getFrauById(chatId);
  if (!frau) return { success: false, error: 'unknown' };

  // Coin-Check + Abbuchung
  const ok = deductCoins(frau.coinPrice);
  if (!ok) return { success: false, error: 'insufficient_coins' };

  // User-Nachricht speichern
  const message: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chatId,
    sender: 'user',
    text,
    timestamp: Date.now(),
    read: true,
  };

  const messages = loadMessages();
  messages.push(message);
  saveMessages(messages);

  // Chat-Metadaten updaten
  const chats = loadChats();
  const updated = chats.map((c) =>
    c.id === chatId
      ? { ...c, lastMessage: text, lastTimestamp: Date.now() }
      : c
  );
  saveChats(updated);

  // Mock-Reply nach 4-12 Sekunden triggern
  scheduleFrauReply(chatId);

  return { success: true, message };
}

// ============================================================================
// MOCK-REPLY — Frau antwortet nach Delay
// ============================================================================

function scheduleFrauReply(chatId: string) {
  if (typeof window === 'undefined') return;
  const frau = getFrauById(chatId);
  if (!frau) return;

  // Typing-Indicator nach 1-3s zeigen (UI hört auf 'typing:start' Event)
  const typingDelay = 1000 + Math.random() * 2000;
  // Reply nach 4-12s
  const replyDelay = 4000 + Math.random() * 8000;

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('typing:start', { detail: { chatId } }));
  }, typingDelay);

  setTimeout(() => {
    // Zufällige Antwort aus dem Reply-Pool wählen
    const reply = frau.replies[Math.floor(Math.random() * frau.replies.length)];

    const message: Message = {
      id: `msg_${Date.now()}_frau`,
      chatId,
      sender: 'frau',
      text: reply,
      timestamp: Date.now(),
      read: false,
    };

    const messages = loadMessages();
    messages.push(message);
    saveMessages(messages);

    // Chat-Metadaten updaten
    const chats = loadChats();
    const updated = chats.map((c) =>
      c.id === chatId
        ? {
            ...c,
            lastMessage: reply,
            lastTimestamp: Date.now(),
            unreadCount: c.unreadCount + 1,
          }
        : c
    );
    saveChats(updated);

    // UI benachrichtigen
    window.dispatchEvent(new CustomEvent('typing:stop', { detail: { chatId } }));
    window.dispatchEvent(new CustomEvent('message:new', { detail: { chatId, message } }));
  }, replyDelay);
}

// ============================================================================
// UTIL — Zeit-Formatierung für UI
// ============================================================================

export function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// ============================================================================
// DEBUG / RESET — für Entwicklung
// ============================================================================

export function resetChatStore() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_CHATS);
  localStorage.removeItem(KEY_MESSAGES);
  localStorage.removeItem(KEY_COINS);
}
