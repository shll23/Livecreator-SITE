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
import CoinIcon from '@/components/CoinIcon';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
    }
  }, [router]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialConversationId && initialConversationId !== activeId) {
      setActiveId(initialConversationId);
      setMobileView('chat');
    }
  }, [initialConversationId, activeId]);

  function openChat(id: string) {
    setActiveId(id);
    setMobileView('chat');
    window.history.pushState(null, '', `/inbox/${id}`);
  }

  function backToList() {
    setMobileView('list');
    setActiveId(null);
    window.history.pushState(null, '', '/inbox');
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

  const messagePrice = activeDetail?.message_price_coins || 0;
  const canSend = balance !== null && balance >= messagePrice && text.trim().length > 0 && !sending;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <AppHeader />

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        {/* LISTE */}
        <aside
          className={`
            w-full lg:w-[360px] lg:border-r border-zinc-200 bg-white flex flex-col
            ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}
          `}
        >
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-100">
            <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
              Nachrichten
            </h1>
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
                <p className="text-xs text-zinc-600 mb-4">
                  Schreibe eine Frau an, um ein Gespräch zu starten.
                </p>
                <Link
                  href="/explore"
                  className="inline-block bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-brand-700 transition-colors"
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
                    w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100 text-left
                    ${activeId === c.id ? 'bg-brand-50/60' : ''}
                  `}
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

        {/* CHAT */}
        <main
          className={`
            flex-1 flex flex-col bg-zinc-50
            ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}
          `}
        >
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-zinc-500">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Wähle einen Chat aus der Liste</p>
              </div>
            </div>
          ) : loadingChat && !activeDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-7 h-7 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeDetail ? (
            <>
              {/* Chat-Header */}
              <div className="px-3 sm:px-5 py-2.5 bg-white border-b border-zinc-200 flex items-center gap-2.5">
                <button
                  onClick={backToList}
                  className="lg:hidden p-1 -ml-1 hover:bg-zinc-100 rounded-full"
                  aria-label="Zurück"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>

                <div className="relative shrink-0">
                  {activeDetail.peer_avatar ? (
                    <img src={activeDetail.peer_avatar} alt={activeDetail.peer_name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-200" />
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border-2 border-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{activeDetail.peer_name}</div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <CoinIcon size={9} />
                    {activeDetail.message_price_coins} pro Nachricht
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
                    <div className="relative mb-4">
                      {activeDetail.peer_avatar ? (
                        <img
                          src={activeDetail.peer_avatar}
                          alt={activeDetail.peer_name}
                          className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-pink"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-zinc-200" />
                      )}
                      <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-zinc-900 mb-1">
                      Starte das Gespräch
                    </h3>
                    <p className="text-xs text-zinc-500 mb-5 max-w-xs">
                      Sag kurz Hallo oder stelle {activeDetail.peer_name} eine persönliche Frage.
                    </p>
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      {SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(null, s)}
                          disabled={sending || balance === null || balance < messagePrice}
                          className="text-left text-sm bg-white border border-zinc-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-2xl px-4 py-2.5 text-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
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
                          <div className="w-6 shrink-0">
                            {showAvatar && activeDetail.peer_avatar && (
                              <img src={activeDetail.peer_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                            )}
                          </div>
                        )}
                        <div
                          className={`
                            max-w-[78%] sm:max-w-[65%] px-3.5 py-2 rounded-2xl
                            ${isUser
                              ? 'bg-brand-600 text-white rounded-br-sm'
                              : 'bg-white text-zinc-900 rounded-bl-sm border border-zinc-200'
                            }
                          `}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`text-[10px] mt-0.5 ${isUser ? 'text-pink-100' : 'text-zinc-500'}`}>
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
              <div className="bg-white border-t border-zinc-200 px-3 sm:px-4 py-2.5">
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

                <form onSubmit={(e) => handleSend(e)} className="flex items-end gap-2">
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
                    className="flex-1 resize-none rounded-2xl border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:bg-white focus:outline-none transition-all max-h-32"
                    style={{
                      minHeight: '36px',
                      height: Math.min(36 + Math.floor((text.length - 1) / 50) * 20, 128) + 'px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="shrink-0 w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <CoinIcon size={10} />
                    {messagePrice} pro Nachricht
                  </span>
                  {balance !== null && (
                    <span className="flex items-center gap-1">
                      Guthaben:
                      <CoinIcon size={10} />
                      <span className="font-semibold text-zinc-800">{balance}</span>
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
