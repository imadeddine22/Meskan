'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n/useT';

/** Admin: Meskan's own phone / email, shown on every listing (houses, sales, projects) instead of the publishers' contacts. */
export default function MeskanContactForm() {
  const { t } = useT();
  const [form, setForm] = useState({ phone: '', email: '' });
  const [state, setState] = useState(''); // '' | 'saving' | 'saved' | error message

  useEffect(() => {
    api.get('/pricing/prices').then(({ data }) => setForm({ phone: data.settings?.investContact?.phone || '', email: data.settings?.investContact?.email || '' })).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setState('saving');
    try {
      await api.put('/pricing/prices', { investContact: form });
      setState('saved');
    } catch (err) {
      setState(err.message);
    }
  };

  const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B3D2]';
  return (
    <form onSubmit={save} className="mb-5 rounded-2xl bg-white p-4 shadow-card">
      <p className="flex items-center gap-1.5 font-bold text-ink">
        <ShieldCheck className="h-5 w-5 text-[#00B3D2]" aria-hidden="true" /> {t('Vos coordonnées d’intermédiaire')}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{t('Affichées sur toutes les annonces (locations, ventes, projets) à la place des coordonnées des propriétaires, vendeurs et investisseurs, qui restent privées.')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-semibold text-gray-600">
          {t('Téléphone / WhatsApp')}
          <input value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setState(''); }} type="tel" dir="ltr" placeholder="0770 00 00 00" className={`${input} mt-1 rtl:text-right`} />
        </label>
        <label className="text-xs font-semibold text-gray-600">
          {t('Email')}
          <input value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setState(''); }} type="email" className={`${input} mt-1`} />
        </label>
        <button type="submit" disabled={state === 'saving'} className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-5 text-sm font-bold text-white disabled:opacity-60">
          {state === 'saved' ? <><Check className="h-4 w-4" aria-hidden="true" /> {t('Enregistré')}</> : state === 'saving' ? t('Enregistrement...') : t('Enregistrer')}
        </button>
      </div>
      {!form.phone && !form.email && state !== 'saving' && <p className="mt-2 text-xs font-semibold text-amber-700">{t('Ajoutez au moins un numéro : sans lui, les visiteurs ne peuvent vous joindre que par le formulaire.')}</p>}
      {state && !['saving', 'saved'].includes(state) && <p className="mt-2 text-xs text-red-600">{state}</p>}
    </form>
  );
}
