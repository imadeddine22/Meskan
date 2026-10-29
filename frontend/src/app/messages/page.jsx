'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ShieldCheck, Tag, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useT } from '@/lib/i18n/useT';
import { dateLocale } from '@/lib/i18n/format';

const POLL_MS = 15000;

/**
 * The user's conversation with Meskan. Meskan is the intermediary between guests and owners, buyers and
 * sellers, investors and project owners: users never write to each other, only to Meskan.
 * ?about=… (from a booking or a listing) says what the next message is about.
 */
export default function MessagesPage() {
  const { t } = useT();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [about, setAbout] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/support/thread');
      setThread(data.thread);
      window.dispatchEvent(new Event('messages-read'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return undefined;
    }
    // Meskan's side of the conversations lives in the admin space
    if (user.role === 'admin') {
      router.replace('/admin/support');
      return undefined;
    }
    setAbout(new URLSearchParams(window.location.search).get('about')?.slice(0, 200) || '');
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [user, authLoading, router, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await api.post('/support/thread/messages', { text: body, about });
      setText('');
      setAbout('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const fmt = (d) => new Date(d).toLocaleString(dateLocale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-extrabold text-ink">{t('Messages')}</h1>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-label={t('Conversation')}>
          <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-ink">{t('Équipe Meskan')}</p>
              <p className="text-xs text-gray-500">{t('Nous faisons le lien avec les propriétaires, vendeurs et investisseurs : écrivez-nous ici.')}</p>
            </div>
          </header>

          <ol className="flex-1 space-y-3 overflow-y-auto bg-gray-50/50 p-4" style={{ maxHeight: '55vh' }}>
            {!thread ? (
              <li className="text-center text-sm text-gray-400">{t('Chargement...')}</li>
            ) : (
              thread.messages.length === 0 && <li className="text-center text-sm text-gray-400">{t('Écrivez votre premier message à l’équipe Meskan.')}</li>
            )}
            {thread?.messages.map((m) => {
              const mine = !m.fromAdmin;
              return (
                <li key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? 'rounded-ee-sm bg-brand-500 text-white' : 'rounded-es-sm bg-white text-gray-800'}`}>
                    {m.about && <p className={`mb-1 text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-brand-600'}`}>{m.about}</p>}
                    <p className="whitespace-pre-line break-words">{m.text}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                      {fmt(m.createdAt)}{mine && m.readAt ? ` · ${t('Lu')}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
            <li ref={endRef} aria-hidden="true" />
          </ol>

          {about && (
            <p className="flex items-center gap-2 border-t border-gray-100 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700">
              <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{t('À propos de :')} {about}</span>
              <button type="button" onClick={() => setAbout('')} aria-label={t('Retirer')} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </p>
          )}
          <form onSubmit={send} className="flex gap-2 border-t border-gray-100 p-3">
            <label htmlFor="msg" className="sr-only">{t('Votre message')}</label>
            <textarea
              id="msg"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
              maxLength={2000}
              rows={1}
              placeholder={t('Votre message…')}
              className="max-h-32 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button disabled={sending || !text.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40" aria-label={t('Envoyer')}>
              <Send className="h-4 w-4 rtl:rotate-180" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
