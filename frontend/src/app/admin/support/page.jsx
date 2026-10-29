'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessagesSquare, Phone, Mail, Send } from 'lucide-react';
import api from '@/lib/api';
import MeskanContactForm from '@/components/MeskanContactForm';
import { useT } from '@/lib/i18n/useT';
import { dateLocale } from '@/lib/i18n/format';

const POLL_MS = 15000;
const ROLE = { customer: 'Voyageur', owner: 'Propriétaire', seller: 'Vendeur', investor: 'Investisseur', admin: 'Admin' };

/**
 * Admin (Meskan): conversations with users. Users never write to each other, only to Meskan, which puts
 * guests and owners, buyers and sellers, investors and project owners in touch.
 */
export default function AdminSupportPage() {
  const { t } = useT();
  const [threads, setThreads] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/support', { localize: false });
      setThreads(data.threads || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadThread = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/admin/support/${id}`, { localize: false });
      setThread(data.thread);
      window.dispatchEvent(new Event('messages-read'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, POLL_MS);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!activeId) return undefined;
    loadThread(activeId);
    const timer = setInterval(() => loadThread(activeId), POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !thread?.user?._id) return;
    setSending(true);
    try {
      await api.post(`/admin/support/user/${thread.user._id}/messages`, { text: body });
      setText('');
      await Promise.all([loadThread(activeId), loadList()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const fmt = (d) => new Date(d).toLocaleString(dateLocale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const tel = (n = '') => `tel:${String(n).replace(/[^\d+]/g, '')}`;
  const u = thread?.user;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title flex items-center gap-2">
          <MessagesSquare className="h-6 w-6 text-brand-500" aria-hidden="true" /> {t('Discussions')}
        </h1>
        <p className="admin-page-subtitle">{t('Les utilisateurs ne s’écrivent pas entre eux : ils écrivent à Meskan, et vous faites le lien.')}</p>
      </div>

      <MeskanContactForm />

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid min-h-[60vh] grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card md:grid-cols-[320px_1fr]">
        {/* Conversations (hidden on mobile while one is open) */}
        <aside className={`min-w-0 border-gray-100 md:border-e ${activeId ? 'hidden md:block' : ''}`}>
          {threads === null ? (
            <p className="p-8 text-center text-sm text-gray-400">{t('Chargement...')}</p>
          ) : threads.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">{t('Aucune discussion pour le moment.')}</p>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {threads.map((c) => (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c._id)}
                    className={`w-full border-b border-gray-50 px-4 py-3 text-start transition hover:bg-gray-50 ${activeId === c._id ? 'bg-brand-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-extrabold text-ink' : 'font-semibold text-gray-800'}`}>{c.user?.fullName || t('Utilisateur supprimé')}</span>
                      {c.unread > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">{c.unread}</span>}
                    </div>
                    <p className="truncate text-xs text-gray-500">{t(ROLE[c.user?.role] || 'Utilisateur')}{c.lastMessage?.about ? ` · ${c.lastMessage.about}` : ''}</p>
                    {c.lastMessage && <p className="mt-0.5 truncate text-xs text-gray-400">{c.lastMessage.fromAdmin ? `${t('Vous')} : ` : ''}{c.lastMessage.text}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Conversation */}
        <section className={`flex min-w-0 flex-col ${activeId ? '' : 'hidden md:flex'}`} aria-label={t('Conversation')}>
          {!thread ? (
            <p className="m-auto p-8 text-sm text-gray-400">{t('Choisissez une conversation.')}</p>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
                <button type="button" onClick={() => { setActiveId(null); setThread(null); }} className="md:hidden" aria-label={t('Retour')}>
                  <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{u?.fullName} <span className="text-xs font-semibold text-gray-400">· {t(ROLE[u?.role] || 'Utilisateur')}</span></p>
                  {/* the user's contact: seen only by Meskan */}
                  <p className="mt-0.5 flex flex-wrap gap-3 text-xs">
                    {u?.phone && <a href={tel(u.phone)} dir="ltr" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> {u.phone}</a>}
                    {u?.email && <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {u.email}</a>}
                  </p>
                </div>
              </header>
              <ol className="flex-1 space-y-3 overflow-y-auto bg-gray-50/50 p-4" style={{ maxHeight: '55vh' }}>
                {thread.messages.map((m) => (
                  <li key={m._id} className={`flex ${m.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.fromAdmin ? 'rounded-ee-sm bg-brand-500 text-white' : 'rounded-es-sm bg-white text-gray-800'}`}>
                      {m.about && <p className={`mb-1 text-[11px] font-semibold ${m.fromAdmin ? 'text-white/80' : 'text-brand-600'}`}>{m.about}</p>}
                      <p className="whitespace-pre-line break-words" dir="auto">{m.text}</p>
                      <p className={`mt-1 text-[10px] ${m.fromAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                        {fmt(m.createdAt)}{m.fromAdmin && m.readAt ? ` · ${t('Lu')}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
                <li ref={endRef} aria-hidden="true" />
              </ol>
              <form onSubmit={send} className="flex gap-2 border-t border-gray-100 p-3">
                <label htmlFor="reply" className="sr-only">{t('Votre réponse')}</label>
                <textarea
                  id="reply"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
                  maxLength={2000}
                  rows={1}
                  placeholder={t('Votre réponse…')}
                  className="max-h-32 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button disabled={sending || !text.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40" aria-label={t('Envoyer')}>
                  <Send className="h-4 w-4 rtl:rotate-180" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
