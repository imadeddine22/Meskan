'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { WILAYA_LIST } from '@/lib/wilayas';
import { wilayaPhoto } from '@/lib/wilayaPhotos';
import { useT } from '@/lib/i18n/useT';

const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** All 69 wilayas in one row, each with its photo and what is published there; picking one shows its hotels, rentals, sales and projects right on the home page. */
export default function CitiesSection({ selectedCity, onSelectCity }) {
  const { t, lang } = useT();
  const [counts, setCounts] = useState({});
  const row = useRef(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/wilayas/counts').then(({ data }) => setCounts(data.counts || {})).catch(() => {});
  }, []);

  const list = useMemo(() => {
    const n = norm(q);
    if (!n) return WILAYA_LIST;
    return WILAYA_LIST.filter((w) => norm(w.name).includes(n) || norm(w.ascii).includes(n) || w.arabic.includes(q.trim()) || String(w.code) === n || String(w.code).padStart(2, '0') === n);
  }, [q]);
  const shown = list;
  // one row: the arrows slide it by about one screen width (physical left / right, in Arabic too)
  const slide = (dir) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.85, behavior: 'smooth' });
  useEffect(() => { row.current?.scrollTo({ left: 0 }); }, [q]);
  // keep the chosen wilaya centred in the row (scrolls the row only, not the page)
  useEffect(() => {
    const el = row.current;
    const card = el?.querySelector('[aria-pressed="true"]');
    if (!card) return;
    const r = el.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    el.scrollBy({ left: c.left + c.width / 2 - (r.left + r.width / 2) });
  }, [selectedCity]);

  const pick = (name) => {
    onSelectCity?.(selectedCity === name ? '' : name);
    requestAnimationFrame(() => document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const summary = (c) => {
    if (!c) return t('Bientôt des annonces');
    const parts = [
      c.hotels && t('{n} hôtel(s)', { n: c.hotels }),
      c.houses && t('{n} location(s)', { n: c.houses }),
      c.sales && t('{n} à vendre', { n: c.sales }),
      c.projects && t('{n} projet(s)', { n: c.projects }),
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : t('Bientôt des annonces');
  };

  return (
    <section id="wilayas" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow">
            <MapPin className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold text-ink">{t.discoverByCity}</h2>
            <p className="text-sm text-gray-500">{t('Les 69 wilayas : hôtels, locations, biens à vendre et projets de chacune')}</p>
          </div>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Chercher une wilaya (nom ou code)')}
            aria-label={t('Chercher une wilaya (nom ou code)')}
            className="w-full rounded-full border border-gray-200 bg-white py-2.5 pe-4 ps-9 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-gray-500">{t('Aucune wilaya ne correspond à « {q} »', { q })}</p>
      ) : (
        <div className="relative">
          {shown.length > 2 && [[-1, ChevronLeft, 'left-0'], [1, ChevronRight, 'right-0']].map(([dir, Icon, side]) => (
            <button
              key={dir}
              type="button"
              onClick={() => slide(dir)}
              aria-label={dir < 0 ? t('Précédent') : t('Suivant')}
              className={`absolute ${side} top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lg ring-1 ring-black/5 transition hover:bg-brand-50 hover:text-brand-600 sm:h-11 sm:w-11`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}
        <div ref={row} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 py-2 sm:gap-4">
          {shown.map((w) => {
            const c = counts[w.name];
            return (
              <button
                key={w.code}
                type="button"
                onClick={() => pick(w.name)}
                aria-pressed={selectedCity === w.name}
                className={`group relative h-44 w-40 shrink-0 snap-start overflow-hidden rounded-2xl text-start shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-48 lg:w-[calc((100%-5*1rem)/6)] ${selectedCity === w.name ? 'ring-4 ring-brand-500 ring-offset-2' : ''}`}
              >
                <img src={wilayaPhoto(w.code)} alt={lang === 'ar' ? w.arabic : w.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="absolute start-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">{String(w.code).padStart(2, '0')}</span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="text-base font-bold leading-tight text-white sm:text-lg">{lang === 'ar' ? w.arabic : w.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-200 sm:text-xs">{summary(c)}</p>
                </div>
              </button>
            );
          })}
        </div>
        </div>
      )}

    </section>
  );
}
