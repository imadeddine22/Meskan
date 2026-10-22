'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, X, Tag, House, BedDouble, Landmark, ChevronDown } from 'lucide-react';
import Link from '@/components/LocaleLink';
import { QUICK_AREAS } from '@/lib/data';
import { WILAYAS } from '@/lib/wilayas';
import { useT } from '@/lib/i18n/useT';

const SEARCH_DELAY_MS = 350;

// Shortcuts to the main sections, computers only (phones have the menu)
const SHORTCUTS = [
  { href: '/sales', key: 'navSales', icon: Tag },
  { href: '/houses', key: 'navHouses', icon: House },
  { href: '/hotels', key: 'navHotels', icon: BedDouble },
  { href: '/investir', key: 'Investir', icon: Landmark, highlight: true },
];

/**
 * Home search. Filters the hotels / houses / sales sections of the home page
 * in place (by wilaya or commune) while the user types, via `onSearch(place)`.
 */
export default function Hero({ value = '', onSearch }) {
  const { t, lang } = useT();

  const [text, setText] = useState(value);
  const [shortcutsOpen, setShortcutsOpen] = useState(false); // quick-access buttons, opened with the arrow
  const timer = useRef(null);
  const lastSent = useRef(value);

  const send = (next) => {
    lastSent.current = next;
    onSearch?.(next);
  };

  // Keep the input in sync when the place changes elsewhere (city cards, "clear", wilaya spelling fix),
  // but not when it is just the echo of what we sent: that would erase letters typed since.
  useEffect(() => {
    if (value !== lastSent.current) setText(value);
    lastSent.current = value;
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const scrollToResults = () =>
    requestAnimationFrame(() => document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  const apply = (next, { scroll = false } = {}) => {
    clearTimeout(timer.current);
    send(next.trim());
    if (scroll && next.trim()) scrollToResults();
  };

  const onType = (next) => {
    setText(next);
    clearTimeout(timer.current);
    // Live results: wait for a short pause, and ignore single letters
    if (next.trim().length === 0 || next.trim().length >= 2) {
      timer.current = setTimeout(() => send(next.trim()), SEARCH_DELAY_MS);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    apply(text, { scroll: true });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-500/10 via-white to-gray-50 pb-16 pt-12 sm:pt-20">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Shortcuts (computers only): hidden behind an arrow; when opened, a column in the empty left
            area on wide screens, a row above the title on smaller computers */}
        <div className="mb-8 hidden flex-col items-center gap-2 lg:flex xl:absolute xl:left-4 xl:top-0 xl:mb-0 xl:w-40 xl:items-start">
          <button
            type="button"
            onClick={() => setShortcutsOpen((o) => !o)}
            aria-expanded={shortcutsOpen}
            aria-controls="hero-shortcuts"
            aria-label={shortcutsOpen ? t('Masquer l’accès rapide') : t('Accès rapide')}
            title={t('Accès rapide')}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 transition hover:text-ink hover:shadow-md"
          >
            <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${shortcutsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {shortcutsOpen && (
            <nav
              id="hero-shortcuts"
              aria-label={t('Accès rapide')}
              className="flex flex-wrap justify-center gap-2 animate-[welcome-fade_.2s_ease-out] xl:w-full xl:flex-col xl:flex-nowrap"
            >
              {SHORTCUTS.map(({ href, key, icon: Icon, highlight }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
                    highlight ? 'text-[#0b2a3a] ring-transparent' : 'bg-white text-ink ring-gray-100 hover:ring-brand-200'
                  }`}
                  style={highlight ? { background: 'linear-gradient(135deg, #0DD5C4, #00B3D2)' } : undefined}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${highlight ? 'bg-white/30' : 'bg-brand-50 text-brand-600'}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 whitespace-nowrap xl:text-[13px]">{t[key] || t(key)}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Title */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {t.heroTitle}
          </h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            {t.heroSubtitle}
          </p>
        </div>

        {/* Search Box */}
        <form
          onSubmit={handleSubmit}
          role="search"
          className="mx-auto mt-8 max-w-4xl rounded-3xl bg-white p-4 shadow-xl ring-1 ring-gray-100 sm:p-6"
        >
          <div className="flex gap-4">
            {/* Wilaya / City */}
            <div className="flex-1">
              <label htmlFor="hero-place" className="mb-1 block text-xs font-bold text-gray-500">
                {t.searchDestination}
              </label>
              <div className="relative flex items-center">
                <MapPin className="pointer-events-none absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input
                  id="hero-place"
                  type="search"
                  list="hero-wilayas"
                  autoComplete="off"
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  placeholder={t.searchWilayaPlaceholder}
                  className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold outline-none focus:border-brand-500 rtl:pr-10 rtl:pl-10 ltr:pl-10 ltr:pr-10"
                />
                <datalist id="hero-wilayas">
                  {/* Arabic visitors pick/type Arabic names; the API maps them to the stored French names */}
                  {WILAYAS.map((w) => <option key={w} value={lang === 'ar' ? t(w) : w} />)}
                </datalist>
                {text && (
                  <button
                    type="button"
                    onClick={() => { setText(''); apply(''); }}
                    aria-label={t('Effacer la recherche')}
                    className="absolute right-2 rtl:right-auto rtl:left-2 grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <button
                type="submit"
                aria-label={t.searchBtn}
                className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-white shadow-md transition hover:bg-brand-600"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Areas */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            {QUICK_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                aria-pressed={value === area}
                onClick={() => { setText(area); apply(area, { scroll: true }); }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  value === area
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                }`}
              >
                {t(area)}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
