'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  getInbox,
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  getCustomerInfo,
  getMe,
  formatRelativeTime,
  formatTime,
  APIError,
  type Conversation,
  type ConversationDetail,
  type Message,
  type CustomerInfo,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';

type FilterType = 'all' | 'unread' | 'unanswered';

// Formatiert Cents als Euro
function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

// Coins zu € (10 Coins = 1€)
function coinsToEuro(coins: number): string {
  return formatEuro(coins * 10);
}

// Initials für Avatar
function initials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

export default function InboxPage() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  // Mobile-Layout: welche Spalte ist sichtbar
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // === Auth-Check ===
  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    getMe().then(me => setDisplayName(me?.display_name || '')).catch(() => {});
  }, [router]);

  // === Inbox-Liste laden ===
  const loadInbox = useCallback(async () => {
    try {
      const res = await getInbox();
      setConversations(res.conversations);
    } catch (err) {
      console.error('Inbox load:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // === Chat laden ===
  const loadChat = useCallback(async (id: string) => {
    setLoadingChat(true);
    setError(null);
    try {
      const [detail, msgs] = await Promise.all([
        getConversation(id),
        getMessages(id),
      ]);
      setActiveDetail(detail);
      setMessages(msgs.messages);
      // Customer-Info parallel laden
      getCustomerInfo(detail.customer_user_id)
        .then(setCustomerInfo)
        .catch(() => setCustomerInfo(null));
      // Als gelesen markieren
      if (detail.unread_count > 0) {
        markConversationRead(id).catch(() => {});
        loadInbox();
      }
    } catch (err) {
      setError('Chat konnte nicht geladen werden.');
    } finally {
      setLoadingChat(false);
    }
  }, [loadInbox]);

  useEffect(() => {
    if (activeId) {
      loadChat(activeId);
    } else {
      setActiveDetail(null);
      setMessages([]);
      setCustomerInfo(null);
    }
  }, [activeId, loadChat]);

  // === Polling alle 3s ===
  useEffect(() => {
    const interval = setInterval(() => {
      loadInbox();
      if (activeId) {
        getMessages(activeId).then(res => {
          setMessages(prev => res.messages.length !== prev.length ? res.messages : prev);
        }).catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeId, loadInbox]);

  // Scroll-to-bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // === Filter anwenden ===
  const filteredConversations = conversations.filter(c => {
    if (filter === 'unread') return c.unread_count > 0;
    if (filter === 'unanswered') {
      // "Unbeantwortet" = letzte Nachricht war von Customer (also unread für Creator)
      return c.unread_count > 0;
    }
    return true;
  });

  // === Counts für Filter-Tabs ===
  const counts = {
    all: conversations.length,
    unread: conversations.filter(c => c.unread_count > 0).length,
    unanswered: conversations.filter(c => c.unread_count > 0).length,
  };

  // === Navigation zwischen Chats (durchblättern) ===
  const currentIndex = activeId
    ? filteredConversations.findIndex(c => c.id === activeId)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredConversations.length - 1;

  function goToPrev() {
    if (hasPrev) {
      setActiveId(filteredConversations[currentIndex - 1].id);
    }
  }
  function goToNext() {
    if (hasNext) {
      setActiveId(filteredConversations[currentIndex + 1].id);
    }
  }

  // === Antworten senden ===
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!activeId || !body || sending) return;

    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_role: 'creator',
      sender_id: '',
      msg_type: 'text',
      body,
      coin_cost: 0,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setSending(true);
    setError(null);

    try {
      const res = await sendMessage(activeId, body);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.id, sender_id: res.sender_id } : m));
      loadInbox();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(body);
      setError('Nachricht konnte nicht gesendet werden.');
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  function openChat(id: string) {
    setActiveId(id);
    setMobileView('chat');
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar displayName={displayName} />

      <main className="flex-1 flex h-dvh overflow-hidden">
        {/* ============== SPALTE 1: Conversation-Liste ============== */}
        <section className={`
          ${mobileView === 'list' ? 'flex' : 'hidden'}
          lg:flex w-full lg:w-80 xl:w-96 shrink-0 flex-col bg-white border-r border-zinc-200
        `}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200">
            <h1 className="font-display text-xl font-semibold text-zinc-900 tracking-tight">
              Nachrichten
            </h1>
          </div>

          {/* Filter-Tabs */}
          <div className="flex border-b border-zinc-200 bg-white">
            {([
              { key: 'all', label: 'Alle' },
              { key: 'unread', label: 'Ungelesen' },
              { key: 'unanswered', label: 'Unbeantwortet' },
            ] as { key: FilterType; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`flex-1 px-2 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  filter === t.key
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                    filter === t.key ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-zinc-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-200 rounded w-1/3" />
                      <div className="h-3 bg-zinc-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Keine Konversationen in dieser Kategorie.
              </div>
            ) : (
              filteredConversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => openChat(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-100 text-left hover:bg-zinc-50 transition-colors ${
                    activeId === c.id ? 'bg-zinc-100' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600">
                      {initials(c.peer_name)}
                    </div>
                    {c.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-zinc-900 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center tabular-nums">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${c.unread_count > 0 ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                        {c.peer_name}
                      </span>
                      <span className="text-[10px] text-zinc-500 shrink-0 tabular-nums">
                        {formatRelativeTime(c.last_message_at)}
                      </span>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? 'text-zinc-700' : 'text-zinc-500'}`}>
                      {c.last_message_preview || 'Neuer Chat'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* ============== SPALTE 2: Chat ============== */}
        <section className={`
          ${mobileView === 'chat' ? 'flex' : 'hidden'}
          lg:flex flex-1 flex-col bg-zinc-50 min-w-0
        `}>
          {!activeDetail ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-zinc-300 mb-3">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-sm">Wähle eine Nachricht aus der Liste</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat-Header */}
              <div className="shrink-0 px-4 sm:px-5 py-3 bg-white border-b border-zinc-200 flex items-center gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="lg:hidden p-1.5 -ml-1 hover:bg-zinc-100 rounded-full transition-colors"
                  aria-label="Zurück"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0">
                  {initials(activeDetail.peer_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-zinc-900 truncate">
                    {activeDetail.peer_name}
                  </div>
                  {customerInfo && (
                    <div className="text-[11px] text-zinc-500">
                      Kunde seit {formatRelativeTime(customerInfo.joined_at)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setMobileView('info')}
                  className="xl:hidden p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
                  aria-label="Info"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-zinc-500">
                    Noch keine Nachrichten.
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isCreator = m.sender_role === 'creator';
                    return (
                      <div key={m.id} className={`flex ${isCreator ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] sm:max-w-[65%] px-3.5 py-2 rounded-2xl ${
                          isCreator
                            ? 'bg-zinc-900 text-white rounded-br-sm'
                            : 'bg-white text-zinc-900 rounded-bl-sm border border-zinc-200'
                        }`}>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`text-[10px] mt-0.5 ${isCreator ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Nav-Pfeile zwischen Chats */}
              <div className="shrink-0 bg-zinc-50 border-t border-zinc-200 px-3 py-2 flex items-center justify-between">
                <button
                  onClick={goToPrev}
                  disabled={!hasPrev}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Vorheriger Chat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Vorheriger
                </button>
                <span className="text-[11px] text-zinc-500 tabular-nums">
                  {currentIndex + 1} / {filteredConversations.length}
                </span>
                <button
                  onClick={goToNext}
                  disabled={!hasNext}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Nächster Chat"
                >
                  Nächster
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Input-Bar */}
              <div className="shrink-0 bg-white border-t border-zinc-200 px-3 py-2.5">
                {error && (
                  <div className="px-3 py-1.5 mb-2 bg-red-50 text-red-700 text-xs rounded-lg">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <textarea
                    ref={composerRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Antwort schreiben…"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-zinc-300 px-3.5 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none max-h-32 min-h-[36px]"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="shrink-0 w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </section>

        {/* ============== SPALTE 3: Customer-Info ============== */}
        <aside className={`
          ${mobileView === 'info' ? 'flex' : 'hidden'}
          xl:flex w-full xl:w-80 shrink-0 flex-col bg-white border-l border-zinc-200
        `}>
          {!customerInfo ? (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 p-6 text-center">
              Wähle einen Chat um Kunden-Infos zu sehen.
            </div>
          ) : (
            <>
              {/* Header mit Zurück (Mobile) */}
              <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-zinc-900">Kunden-Info</h2>
                <button
                  onClick={() => setMobileView('chat')}
                  className="xl:hidden p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
                  aria-label="Schließen"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center text-base font-semibold text-zinc-600 shrink-0">
                    {initials(customerInfo.display_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate">
                      {customerInfo.display_name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Kunde seit {formatRelativeTime(customerInfo.joined_at)}
                    </div>
                  </div>
                </div>

                {/* Engagement-Score: Coins die dieser Kunde investiert hat */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1">
                    Coins von diesem Kunden
                  </div>
                  <div className="font-sans text-2xl font-semibold text-zinc-900 tabular-nums tracking-tight">
                    {customerInfo.lifetime_coins.toLocaleString('de-DE')}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Engagement-Score
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Nachrichten von ihm</span>
                    <span className="font-semibold text-zinc-900 tabular-nums">
                      {customerInfo.message_count.toLocaleString('de-DE')}
                    </span>
                  </div>
                  {customerInfo.first_message_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Erste Nachricht</span>
                      <span className="font-medium text-zinc-900">
                        {formatRelativeTime(customerInfo.first_message_at)}
                      </span>
                    </div>
                  )}
                  {customerInfo.last_message_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Letzte Nachricht</span>
                      <span className="font-medium text-zinc-900">
                        {formatRelativeTime(customerInfo.last_message_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Aktiver-Kunde-Hinweis (basierend auf Coins) */}
                {customerInfo.lifetime_coins >= 50 && (
                  <div className="bg-zinc-900 text-white rounded-xl p-3.5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-1">
                      Engagierter Kunde
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      Dieser Kunde schreibt regelmäßig mit dir. Eine persönliche Antwort hält das Gespräch lebendig.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
