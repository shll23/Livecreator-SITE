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
import CoinIcon from '@/components/CoinIcon';

// ============================================================================
// InboxPage v6 — Native WhatsApp-Style Chat
//
// Lösung für iOS Safari Tastatur-Problem:
//   1. Body wird komplett locked (position:fixed, no-scroll) wenn Chat offen
//   2. Chat-Container nutzt visualViewport.height für seine Höhe
//   3. Container wird visualViewport.offsetTop kompensiert
//      → Verhindert dass iOS den Input automatisch ins Sichtbare schiebt
//   4. Bei Tastatur-Öffnung: scrollIntoView auf letzte Nachricht
//      → User sieht die neuesten Messages, nicht leeren Bereich
//   5. Container bewegt sich NIE — nur die innere Höhe ändert sich
// ============================================================================

interface InboxPageProps {
  initialConversationId?: string;
}

const SUGGESTIONS = [
  'Hey, wie war dein Tag?',
  'Was machst du gerade?',
  'Du siehst sympathisch aus 😊',
];

export default function InboxPage({ initialConversationId }: InboxPageProps) {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [activeId, setActiveId] = useState<string | null>(initialConversationId || null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    initialConversationId ? 'chat' : 'list'
  );

  // Visual Viewport State — Höhe + offsetTop für iOS-Tastatur
  const [vvHeight, setVvHeight] = useState<number | null>(null);
  const [vvOffsetTop, setVvOffsetTop] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
    }
  }, [router]);

  // ===========================================================================
  // VISUAL VIEWPORT — Höhe UND offsetTop tracken
  //
  // iOS Safari Verhalten bei Tastatur:
  //   - window.visualViewport.height schrumpft
  //   - window.visualViewport.offsetTop wird > 0 wenn Page auto-scrolled wird
  // 
  // Mit beidem zusammen können wir den Container EXAKT positionieren und
  // verhindern dass iOS uns die Page wegschiebt.
  // ===========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.visualViewport) return;

    function updateViewport() {
      if (!window.visualViewport) return;
      setVvHeight(window.visualViewport.height);
      setVvOffsetTop(window.visualViewport.offsetTop);
    }

    updateViewport();
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);

    return () => {
      if (!window.visualViewport) return;
      window.visualViewport.removeEventListener('resize', updateViewport);
      window.visualViewport.removeEventListener('scroll', updateViewport);
    };
  }, []);

  // ===========================================================================
  // BODY LOCK — Bei aktivem Chat
  //
  // Body wird auf fixed gesetzt damit iOS NICHT die ganze Page hoch-scrolled
  // wenn der User ins Input klickt.
  // ===========================================================================
  useEffect(() => {
    const isChatActive = !!activeId && mobileView === 'chat';
    if (!isChatActive) return;

    const scrollY = window.scrollY;
    const originalStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.width = originalStyle.width;
      window.scrollTo(0, scrollY);
    };
  }, [activeId, mobileView]);

  // ===========================================================================
  // AUTO-SCROLL bei neuen Messages + bei Tastatur-Open
  // ===========================================================================
  function scrollToBottom(smooth = false) {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }

  // Bei neuen Messages: instant scroll
  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Bei Tastatur-Open (vvHeight ändert sich): scroll, damit letzte Messages sichtbar bleiben
  useEffect(() => {
    if (vvHeight === null) return;
    // Kleiner Delay, damit das Layout sich neu rendert
    const t = setTimeout(() => scrollToBottom(false), 50);
    return () => clearTimeout(t);
  }, [vvHeight]);

  // ===========================================================================
  // DATA LOADING
  // ===========================================================================
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
      if (detail.unread_count > 0) {
        await markConversationRead(id).catch(() => {});
        loadInbox();
      }
    } catch (err) {
      console.error('Chat-Load Fehler:', err);
      setError('Chat konnte nicht geladen werden.');
    } finally {
      setLoadingChat(false);
    }
  }, [loadInbox]);

  useEffect(() => {
    loadInbox();
    loadBalance();
  }, [loadInbox, loadBalance]);

  useEffect(() => {
    if (activeId) {
      loadChat(activeId);
    } else {
      setActiveDetail(null);
      setMessages([]);
    }
  }, [activeId, loadChat]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadInbox();
      if (activeId) {
        getMessages(activeId)
          .then((res) => {
            setMessages((prev) => {
              if (res.messages.length !== prev.length) return res.messages;
              return prev;
            });
          })
          .catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeId, loadInbox]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveId(initialConversationId);
      setMobileView('chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  function openChat(id: string) {
    setActiveId(id);
    setMobileView('chat');
    window.history.pushState(null, '', `/inbox/${id}`);
  }

  function backToList() {
    // Beim Verlassen: Input blurren damit Tastatur zugeht
    if (composerRef.current) composerRef.current.blur();
    setMobileView('list');
    setActiveId(null);
    router.push('/inbox');
  }

  async function handleSend(e: React.FormEvent | null, customText?: string) {
    if (e) e.preventDefault();
    const messageBody = (customText ?? text).trim();
    if (!activeId || !messageBody || sending) return;

    const tempId = `temp_${Date.now()}`;
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
    if (!customText) setText('');
    setSending(true);
    setError(null);

    try {
      const res = await sendMessage(activeId, messageBody);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: res.id, sender_id: res.sender_id } : m))
      );
      if (res.balance_coins !== undefined) {
        setBalance(res.balance_coins);
      }
      loadInbox();
      window.dispatchEvent(new Event('app:refresh-balance'));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (!customText) setText(messageBody);
      if (err instanceof APIError) {
        if (err.code === 'insufficient_coins') {
          setError('Du hast nicht genug Coins. Lade dein Guthaben auf.');
        } else {
          setError(`Fehler: ${err.code}`);
        }
      } else {
        setError('Verbindung zum Server fehlgeschlagen.');
      }
    } finally {
      setSending(false);
    }
  }

  const messagePrice = activeDetail?.message_price_coins || 0;
  const canSend = balance !== null && balance >= messagePrice && text.trim().length > 0 && !sending;
  const isChatActive = !!activeId && mobileView === 'chat';

  // ===========================================================================
  // RENDER — Mobile Fullscreen Chat
  // ===========================================================================
  if (isChatActive) {
    // Container Style:
    //   - position: fixed (bleibt verankert)
    //   - top: vvOffsetTop (kompensiert iOS Auto-Scroll)
    //   - height: vvHeight (schrumpft mit Tastatur)
    const mobileContainerStyle: React.CSSProperties = {
      position: 'fixed',
      left: 0,
      right: 0,
      top: vvOffsetTop,
      height: vvHeight ? `${vvHeight}px` : '100dvh',
      zIndex: 50,
    };

    return (
      <>
        {/* DESKTOP: normales Inbox-Layout */}
        <div className="hidden lg:flex flex-col h-dvh bg-zinc-50">
          {renderDesktopLayout()}
        </div>

        {/* MOBILE: Fixed-Fullscreen Chat mit Visual-Viewport-Tracking */}
        <div
          ref={chatContainerRef}
          className="lg:hidden bg-white flex flex-col"
          style={mobileContainerStyle}
        >
          {activeDetail && renderChatContent(true)}
        </div>
      </>
    );
  }

  // ===== NORMAL VIEW =====
  return (
    <div className="flex flex-col h-dvh bg-white lg:bg-zinc-50">
      <header className="lg:hidden shrink-0 bg-white border-b border-zinc-100 px-4 py-2.5 flex items-center justify-between">
        <Link href="/explore" className="inline-flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-600" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span className="font-display text-base font-semibold tracking-tight text-zinc-900">verliebdich</span>
        </Link>
        <Link href="/wallet" className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200/70 bg-white" aria-label="Coins">
          <CoinIcon size={12} />
          <span className="text-[11px] font-semibold text-zinc-700 tabular-nums">{balance !== null ? balance : '…'}</span>
        </Link>
      </header>

      {renderDesktopLayout()}
    </div>
  );

  // ===========================================================================
  // SUB-RENDERERS
  // ===========================================================================

  function renderDesktopLayout() {
    return (
      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        <aside className="w-full lg:w-[360px] lg:border-r border-zinc-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h1 className="font-display text-xl font-semibold tracking-tight">Nachrichten</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-zinc-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-200 rounded w-1/3" />
                      <div className="h-3 bg-zinc-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">💬</div>
                <h2 className="font-semibold text-zinc-900 mb-2 text-sm">Noch keine Nachrichten</h2>
                <p className="text-xs text-zinc-600 mb-4">Schreibe eine Frau an, um ein Gespräch zu starten.</p>
                <Link href="/explore" className="inline-block bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-brand-700">
                  Profile entdecken
                </Link>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openChat(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100 text-left ${activeId === c.id ? 'bg-brand-50/60' : ''}`}
                >
                  <div className="relative shrink-0">
                    {c.peer_avatar ? (
                      <img src={c.peer_avatar} alt={c.peer_name} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-zinc-200" />
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold text-sm truncate ${c.unread_count > 0 ? 'text-zinc-900' : 'text-zinc-700'}`}>
                        {c.peer_name}
                      </span>
                      {c.last_message_at && (
                        <span className="text-[10px] text-zinc-500 shrink-0">{formatTime(c.last_message_at)}</span>
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

        <main className="hidden lg:flex flex-1 flex-col bg-zinc-50 min-w-0">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-zinc-500">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Wähle einen Chat aus der Liste</p>
              </div>
            </div>
          ) : activeDetail ? (
            renderChatContent(false)
          ) : null}
        </main>
      </div>
    );
  }

  function renderChatContent(isMobileFullscreen: boolean) {
    if (!activeDetail) return null;

    return (
      <>
        {/* ============== CHAT-HEADER ============== */}
        <div className="shrink-0 px-3 sm:px-5 py-2.5 bg-white border-b border-zinc-200 flex items-center gap-3 z-10">
          <button
            onClick={backToList}
            className="lg:hidden p-1.5 -ml-1 hover:bg-zinc-100 active:bg-zinc-200 rounded-full transition-colors shrink-0"
            aria-label="Zurück"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          {activeDetail.peer_handle ? (
            <Link
              href={`/profil/${activeDetail.peer_handle}`}
              className="flex items-center gap-2.5 flex-1 min-w-0 hover:bg-zinc-50 active:bg-zinc-100 rounded-lg px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
            >
              <div className="relative shrink-0">
                {activeDetail.peer_avatar ? (
                  <img src={activeDetail.peer_avatar} alt={activeDetail.peer_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-200" />
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] truncate text-zinc-900 leading-tight">
                  {activeDetail.peer_name}
                </div>
                <div className="text-[11px] text-green-600 font-medium">Online</div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative shrink-0">
                {activeDetail.peer_avatar ? (
                  <img src={activeDetail.peer_avatar} alt={activeDetail.peer_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-200" />
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] truncate text-zinc-900 leading-tight">
                  {activeDetail.peer_name}
                </div>
                <div className="text-[11px] text-green-600 font-medium">Online</div>
              </div>
            </div>
          )}

          <Link href="/wallet" className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200/70 bg-white hover:bg-amber-50/40 transition-colors shrink-0" aria-label="Coins">
            <CoinIcon size={12} />
            <span className="text-[11px] font-semibold text-zinc-700 tabular-nums">{balance !== null ? balance : '…'}</span>
          </Link>
        </div>

        {/* ============== MESSAGES — flex-1, scrollable ============== */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain min-h-0 bg-white lg:bg-zinc-50"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {messages.length === 0 ? (
            <div className="min-h-full flex flex-col justify-end px-5 pb-5 pt-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  {activeDetail.peer_avatar ? (
                    <img
                      src={activeDetail.peer_avatar}
                      alt={activeDetail.peer_name}
                      className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-200" />
                  )}
                  <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                </div>
                <h3 className="font-display text-base font-semibold text-zinc-900 mb-0.5">Starte das Gespräch</h3>
                <p className="text-xs text-zinc-500 mb-4 max-w-xs">
                  Sag kurz Hallo oder stelle {activeDetail.peer_name} eine persönliche Frage.
                </p>
                <div className="flex flex-col gap-1.5 w-full max-w-[280px]">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(null, s)}
                      disabled={sending || balance === null || balance < messagePrice}
                      className="tap-shrink text-left text-[13px] bg-white border border-zinc-200 hover:border-zinc-300 active:bg-zinc-50 rounded-xl px-3.5 py-2 text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 sm:px-5 py-3 space-y-2">
              {messages.map((m, i) => {
                const isUser = m.sender_role === 'customer';
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const showAvatar = !isUser && (!prevMsg || prevMsg.sender_role !== m.sender_role);

                return (
                  <div key={m.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-6 shrink-0">
                        {showAvatar && activeDetail.peer_avatar && (
                          <img src={activeDetail.peer_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] sm:max-w-[65%] px-3.5 py-2 rounded-2xl ${
                        isUser
                          ? 'bg-brand-600 text-white rounded-br-sm'
                          : 'bg-white text-zinc-900 rounded-bl-sm border border-zinc-200'
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`text-[10px] mt-0.5 ${isUser ? 'text-pink-100' : 'text-zinc-500'}`}>
                        {formatMessageTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ============== INPUT-BAR ============== */}
        <div
          className="shrink-0 bg-white border-t border-zinc-200"
          style={isMobileFullscreen ? {} : { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {error && (
            <div className="px-3 pt-2 pb-1.5">
              <div className="px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg flex items-center justify-between gap-2">
                <span>{error}</span>
                {error.toLowerCase().includes('coins') && (
                  <Link href="/wallet" className="font-semibold underline whitespace-nowrap shrink-0">
                    Aufladen
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleSend(e)} className="flex items-end gap-2 px-3 py-2">
            <textarea
              ref={composerRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => {
                // Beim Focus: scroll-to-bottom mit kleinem Delay (nach Layout-Update)
                setTimeout(() => scrollToBottom(false), 150);
                setTimeout(() => scrollToBottom(false), 350);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as any);
                }
              }}
              placeholder="Nachricht schreiben…"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:bg-white focus:outline-none transition-all max-h-32 min-h-[36px]"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="shrink-0 w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Senden"
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
    );
  }
}
