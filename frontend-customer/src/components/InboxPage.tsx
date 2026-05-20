'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getInbox,
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  getWallet,
  getAccessToken,
  APIError,
  formatTime,
  formatMessageTime,
  type Conversation,
  type ConversationDetail,
  type Message,
} from '@/lib/api';
import AppHeader from '@/components/AppHeader';

interface InboxPageProps {
  initialConversationId?: string;
}

export default function InboxPage({ initialConversationId }: InboxPageProps) {
  const router = useRouter();

  // Listen-State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Aktiver Chat
  const [activeId, setActiveId] = useState<string | null>(initialConversationId || null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  // Composer
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mobile-State: zeigt entweder Liste oder Chat
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    initialConversationId ? 'chat' : 'list'
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Auth-Check
  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
    }
  }, [router]);

  // ============================================================================
  // INITIAL LOAD + POLLING
  // ============================================================================
  const loadInbox = useCallback(async () => {
    try {
      const res = await getInbox();
      setConversations(res.conversations);
    } catch (err) {
      console.error('Inbox-Load Fehler:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const res = await getWallet();
      setBalance(res.balance_coins);
    } catch {}
  }, []);

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
      // Als gelesen markieren
      if (detail.unread_count > 0) {
        await markConversationRead(id).catch(() => {});
        loadInbox(); // Refresh Liste für Unread-Counter
      }
    } catch (err) {
      console.error('Chat-Load Fehler:', err);
      setError('Chat konnte nicht geladen werden.');
    } finally {
      setLoadingChat(false);
    }
  }, [loadInbox]);

  // Initial: Liste + Balance laden
  useEffect(() => {
    loadInbox();
    loadBalance();
  }, [loadInbox, loadBalance]);

  // Wenn activeId sich ändert: Chat laden
  useEffect(() => {
    if (activeId) {
      loadChat(activeId);
    } else {
      setActiveDetail(null);
      setMessages([]);
    }
  }, [activeId, loadChat]);

  // Polling für Inbox + Messages alle 3 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      loadInbox();
      if (activeId) {
        // Nur Messages refreshen, nicht den Detail (sonst flackert)
        getMessages(activeId)
          .then((res) => {
            setMessages((prev) => {
              // Nur updaten wenn sich was geändert hat (neue Nachrichten)
              if (res.messages.length !== prev.length) {
                return res.messages;
              }
              return prev;
            });
          })
          .catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeId, loadInbox]);

  // Auto-scroll zum neuesten Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // initialConversationId aus URL synchronisieren
  useEffect(() => {
    if (initialConversationId && initialConversationId !== activeId) {
      setActiveId(initialConversationId);
      setMobileView('chat');
    }
  }, [initialConversationId, activeId]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  function openChat(id: string) {
    setActiveId(id);
    setMobileView('chat');
    // URL aktualisieren ohne Reload
    window.history.pushState(null, '', `/inbox/${id}`);
  }

  function backToList() {
    setMobileView('list');
    setActiveId(null);
    window.history.pushState(null, '', '/inbox');
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !text.trim() || sending) return;

    const messageBody = text.trim();
    const tempId = `temp_${Date.now()}`;

    // Optimistic update: Nachricht sofort zeigen
    const optimistic: Message = {
      id: tempId,
      sender_role: 'customer',
      sender_id: '',
      msg_type: 'text',
      body: messageBody,
      coin_cost: activeDetail?.message_price_coins || 0,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setSending(true);
    setError(null);

    try {
      const res = await sendMessage(activeId, messageBody);
      // Optimistic Nachricht durch echte ersetzen
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: res.id, sender_id: res.sender_id } : m))
      );
      // Balance update
      if (res.balance_coins !== undefined) {
        setBalance(res.balance_coins);
      }
      // Inbox-Liste refreshen (für last_message)
      loadInbox();
      // Header refreshen
      window.dispatchEvent(new Event('app:refresh-balance'));
    } catch (err) {
      // Optimistic-Nachricht entfernen
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(messageBody); // User kann nochmal senden
      if (err instanceof APIError) {
        if (err.code === 'insufficient_coins') {
          setError('Du hast nicht genug Coins. Lade auf, um weiterzuschreiben.');
        } else {
          setError(`Fehler: ${err.code}`);
        }
      } else {
        setError('Verbindung zum Server fehlgeschlagen.');
      }
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const messagePrice = activeDetail?.message_price_coins || 0;
  const canSend = balance !== null && balance >= messagePrice && text.trim().length > 0 && !sending;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <AppHeader />

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        {/* ============================================ */}
        {/* LISTE LINKS (Desktop immer, Mobile nur wenn view='list') */}
        {/* ============================================ */}
        <aside
          className={`
            w-full lg:w-[380px] lg:border-r border-zinc-200 bg-white flex flex-col
            ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}
          `}
        >
          <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Chats
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-zinc-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-200 rounded w-1/3" />
                      <div className="h-3 bg-zinc-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">💬</div>
                <h2 className="font-semibold text-zinc-900 mb-2">Noch keine Chats</h2>
                <p className="text-sm text-zinc-600 mb-4">
                  Schreibe eine Frau an, um ein Gespräch zu starten.
                </p>
                <Link
                  href="/explore"
                  className="inline-block bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-brand-700 transition-colors"
                >
                  Profile entdecken
                </Link>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openChat(c.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors border-b border-zinc-100 text-left
                    ${activeId === c.id ? 'bg-brand-50/60' : ''}
                  `}
                >
                  <div className="relative shrink-0">
                    {c.peer_avatar ? (
                      <img src={c.peer_avatar} alt={c.peer_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-200" />
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold text-sm truncate ${c.unread_count > 0 ? 'text-zinc-900' : 'text-zinc-700'}`}>
                        {c.peer_name}
                      </span>
                      {c.last_message_at && (
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {formatTime(c.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={`text-xs truncate ${c.unread_count > 0 ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                        {c.last_message_preview || 'Neuer Chat'}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="shrink-0 bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ============================================ */}
        {/* CHAT RECHTS (Desktop immer, Mobile nur wenn view='chat') */}
        {/* ============================================ */}
        <main
          className={`
            flex-1 flex flex-col bg-zinc-50
            ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}
          `}
        >
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-zinc-500">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-sm">Wähle einen Chat aus der Liste</p>
              </div>
            </div>
          ) : loadingChat && !activeDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeDetail ? (
            <>
              {/* Chat-Header */}
              <div className="px-4 sm:px-6 py-3 bg-white border-b border-zinc-200 flex items-center gap-3">
                <button
                  onClick={backToList}
                  className="lg:hidden p-1 -ml-1 hover:bg-zinc-100 rounded-full"
                  aria-label="Zurück"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>

                <div className="relative shrink-0">
                  {activeDetail.peer_avatar ? (
                    <img src={activeDetail.peer_avatar} alt={activeDetail.peer_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-200" />
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base truncate">{activeDetail.peer_name}</div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {activeDetail.message_price_coins} Coins / Nachricht
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-500 text-sm py-8">
                    Sag „Hallo" 👋
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isUser = m.sender_role === 'customer';
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showAvatar = !isUser && (!prevMsg || prevMsg.sender_role !== m.sender_role);

                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-7 shrink-0">
                            {showAvatar && activeDetail.peer_avatar && (
                              <img src={activeDetail.peer_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                            )}
                          </div>
                        )}
                        <div
                          className={`
                            max-w-[75%] sm:max-w-[65%] px-3.5 py-2 rounded-2xl
                            ${isUser
                              ? 'bg-brand-600 text-white rounded-br-sm'
                              : 'bg-white text-zinc-900 rounded-bl-sm border border-zinc-200'
                            }
                          `}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`text-[10px] mt-1 ${isUser ? 'text-pink-100' : 'text-zinc-500'}`}>
                            {formatMessageTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="bg-white border-t border-zinc-200 px-3 sm:px-4 py-3">
                {error && (
                  <div className="mb-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg flex items-center justify-between gap-2">
                    <span>{error}</span>
                    {error.includes('Coins') && (
                      <Link href="/wallet" className="font-semibold underline whitespace-nowrap">
                        Aufladen
                      </Link>
                    )}
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
                        handleSend(e as any);
                      }
                    }}
                    placeholder="Nachricht schreiben…"
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:bg-white focus:outline-none transition-all max-h-32"
                    style={{
                      minHeight: '40px',
                      height: Math.min(40 + Math.floor((text.length - 1) / 50) * 20, 128) + 'px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="shrink-0 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    aria-label="Senden"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </form>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Senden kostet <span className="font-semibold text-amber-700">{messagePrice} Coins</span></span>
                  {balance !== null && (
                    <span>
                      Du hast <span className="font-semibold text-amber-700">{balance}</span>
                      {balance < messagePrice && (
                        <Link href="/wallet" className="ml-2 text-brand-600 hover:underline font-semibold">
                          Aufladen →
                        </Link>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
