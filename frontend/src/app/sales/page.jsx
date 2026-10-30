'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from '@/components/LocaleLink';
import { MapPin, Search, Home, RefreshCw, BedDouble, Bath, Maximize2, Phone, MessageCircle, Calculator, LayoutGrid, Map as MapIcon, SlidersHorizontal, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api, { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { useWilayas } from '@/hooks/useWilayas';
import { monthlyPayment } from '@/components/tools/MortgageCalculator';
import { useT } from '@/lib/i18n/useT';
import { useInitialData } from '@/components/InitialData';

const HotelsMap = dynamic(() => import('@/components/HotelsMap'), { ssr: false });

// Same list as the HouseForSale model
const PROPERTY_TYPES = ['Appartement', 'Villa', 'Maison', 'Duplex', 'Studio', 'Terrain', 'Local commercial', 'Immeuble', 'Ferme', 'Chalet'];

// Real Algerian property prices (DZD); the last range is open-ended
const PRICE_RANGES = [
  { value: '0-5000000', label: 'Moins de 5 millions DA' },
  { value: '5000000-10000000', label: '5 à 10 millions DA' },
  { value: '10000000-20000000', label: '10 à 20 millions DA' },
  { value: '20000000-50000000', label: '20 à 50 millions DA' },
  { value: '50000000-100000000000', label: 'Plus de 50 millions DA' },
];

// Algerian "F" sizes: F3 = 3 rooms
const ROOMS = [
  { value: '1', label: 'F1' },
  { value: '2', label: 'F2' },
  { value: '3', label: 'F3' },
  { value: '4', label: 'F4' },
  { value: '5+', label: 'F5+' },
];

const SORTS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

const EMPTY = { category: '', type: '', wilaya: '', rooms: '', price: '', minArea: '', maxArea: '', reference: '' };
// Groups of property types (same as SALE_CATEGORIES on the backend): homes, and land / shops / buildings / farms
const CATEGORIES = [
  { key: '', label: 'Tous les biens' },
  { key: 'homes', label: 'Maisons et appartements' },
  { key: 'land', label: 'Terrains, locaux et immeubles' },
];
const NEW_DAYS = 7;

/** "0552 22 22 22" → "213552222222" for wa.me links */
const whatsappNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('213')) return digits;
  return digits.startsWith('0') ? `213${digits.slice(1)}` : `213${digits}`;
};

/** Indicative monthly payment: 20 % deposit, 6 % over 20 years (same defaults as the simulator). */
const estimateMonthly = (price) => monthlyPayment(price * 0.8, 6, 20);

export default function SalesPage() {
  const { t } = useT();
  const initial = useInitialData();
  const { wilayas } = useWilayas();
  const [listings, setListings] = useState(initial?.listings ?? []);
  const [contact, setContact] = useState(initial?.contact || {}); // Meskan's phone: buyers call Meskan, never the seller
  const [loading, setLoading] = useState(!initial?.listings);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(initial?.pages ?? 1);
  const [form, setForm] = useState(EMPTY); // what the user is editing
  const [filters, setFilters] = useState(EMPTY); // what is applied
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid'); // 'grid' | 'map'
  const [showMore, setShowMore] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // /sales?wilaya=…&type=… links (destination pages, home search, home banner categories)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get('wilaya');
    const type = PROPERTY_TYPES.includes(q.get('type')) ? q.get('type') : '';
    const category = CATEGORIES.some((c) => c.key && c.key === q.get('category')) ? q.get('category') : '';
    if (w || type || category) {
      const preset = { ...(w && { wilaya: w }), ...(type && { type }), ...(category && { category }) };
      setForm((f) => ({ ...f, ...preset }));
      setFilters((f) => ({ ...f, ...preset }));
    }
  }, []);

  const silentFirstFetch = useRef(Boolean(initial));
  const lastRequest = useRef(0); // only the latest request may update the list (filters can change mid-flight)
  useEffect(() => {
    (async () => {
      const id = ++lastRequest.current;
      if (!silentFirstFetch.current) setLoading(true);
      silentFirstFetch.current = false;
      try {
        const params = { page, limit: 12, sort };
        if (filters.type) params.type = filters.type;
        else if (filters.category) params.category = filters.category;
        if (filters.wilaya) params.wilaya = filters.wilaya;
        if (filters.rooms) params.rooms = filters.rooms;
        if (filters.price) params.priceRanges = filters.price;
        if (filters.minArea) params.minArea = filters.minArea;
        if (filters.maxArea) params.maxArea = filters.maxArea;
        if (filters.reference) params.reference = filters.reference.trim();
        const { data } = await api.get('/sales', { params });
        if (id !== lastRequest.current) return; // an older request answering late
        setListings(data.listings || []);
        setContact(data.contact || {});
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      } catch (err) {
        console.error(err);
      } finally {
        if (id === lastRequest.current) setLoading(false);
      }
    })();
  }, [page, filters, sort]);

  const apply = (e) => {
    e?.preventDefault();
    setFilters({ ...form });
    setPage(1);
  };
  const reset = () => {
    setForm(EMPTY);
    setFilters(EMPTY);
    setPage(1);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const activeCount = Object.values(filters).filter(Boolean).length;

  const mapItems = useMemo(
    () => listings.map((l) => ({ _id: l._id, name: l.title, type: t(l.type), price: l.price, currency: l.currency, coordinates: l.coordinates })),
    [listings, t]
  );

  const field = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f8f9fc]">
        {/* ── Hero: title + search ── */}
        <section
          className="relative bg-cover bg-center px-4 pb-10 pt-16 md:pt-24"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1600&q=80')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">{t('Maisons et appartements à vendre en Algérie')}</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
              {t('Annonces vérifiées et prix au m². Meskan vous met en relation avec le vendeur et vous accompagne jusqu’à l’achat.')}
            </p>

            {/* Homes, or other real estate (land, shops, buildings, farms) */}
            <div role="tablist" aria-label={t('Catégorie')} className="mt-6 inline-flex flex-wrap gap-1 rounded-2xl bg-white/15 p-1 backdrop-blur">
              {CATEGORIES.map((c) => {
                const on = filters.category === c.key && !filters.type;
                return (
                  <button
                    key={c.key || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => { setForm((f) => ({ ...f, category: c.key, type: '' })); setFilters((f) => ({ ...f, category: c.key, type: '' })); setPage(1); }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${on ? 'bg-white text-slate-900 shadow' : 'text-white hover:bg-white/10'}`}
                  >
                    {t(c.label)}
                  </button>
                );
              })}
            </div>

            <form onSubmit={apply} className="mt-4 rounded-2xl bg-white p-3 shadow-2xl md:p-4" role="search" aria-label={t('Rechercher un bien')}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <label className="sr-only" htmlFor="f-type">{t('Type de bien')}</label>
                <select id="f-type" value={form.type} onChange={(e) => set('type', e.target.value)} className={field}>
                  <option value="">{t('Tous les types')}</option>
                  {PROPERTY_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                </select>

                <label className="sr-only" htmlFor="f-wilaya">{t('Wilaya')}</label>
                <select id="f-wilaya" value={form.wilaya} onChange={(e) => set('wilaya', e.target.value)} className={field}>
                  <option value="">{t('Toutes les wilayas')}</option>
                  {(wilayas || []).map((w) => <option key={w} value={w}>{t(w)}</option>)}
                </select>

                <label className="sr-only" htmlFor="f-price">{t('Prix')}</label>
                <select id="f-price" value={form.price} onChange={(e) => set('price', e.target.value)} className={field}>
                  <option value="">{t('Tous les prix')}</option>
                  {PRICE_RANGES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
                </select>

                <label className="sr-only" htmlFor="f-ref">{t('Référence')}</label>
                <input id="f-ref" value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder={t('Référence (ex : DZ-2026-…)')} className={field} />

                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-emerald-700">
                  <Search className="h-4 w-4" aria-hidden="true" /> {t('Rechercher')}
                </button>
              </div>

              {/* Rooms + more filters */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500">{t('Pièces')} :</span>
                {ROOMS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={form.rooms === r.value}
                    onClick={() => set('rooms', form.rooms === r.value ? '' : r.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      form.rooms === r.value ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
                <button type="button" onClick={() => setShowMore((v) => !v)} className="ms-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline">
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> {t('Surface')}
                </button>
              </div>
              {showMore && (
                <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-gray-500">
                    {t('Surface min (m²)')}
                    <input type="number" min="0" value={form.minArea} onChange={(e) => set('minArea', e.target.value)} className={`${field} mt-1`} />
                  </label>
                  <label className="text-xs font-semibold text-gray-500">
                    {t('Surface max (m²)')}
                    <input type="number" min="0" value={form.maxArea} onChange={(e) => set('maxArea', e.target.value)} className={`${field} mt-1`} />
                  </label>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* ── Results ── */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-live="polite">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-bold text-gray-900">{t('{n} bien(s) à vendre', { n: total })}</p>
              {activeCount > 0 && (
                <button onClick={reset} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                  <X className="h-3 w-3" aria-hidden="true" /> {t('Effacer les filtres')} ({activeCount})
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="sort">{t('Trier par')}</label>
              <select id="sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-emerald-500">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
              </select>
              <div className="flex rounded-xl border border-gray-200 bg-white p-1" role="group" aria-label={t('Affichage')}>
                {[['grid', LayoutGrid, 'Liste'], ['map', MapIcon, 'Carte']].map(([v, Icon, label]) => (
                  <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${view === v ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">{t(label)}</span><span className="sr-only sm:hidden">{t(label)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid animate-pulse gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-96 rounded-3xl border border-gray-100 bg-white" />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-emerald-50">
                <Home className="h-10 w-10 text-emerald-500" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">{t('Aucun bien ne correspond à votre recherche')}</h2>
              <p className="mx-auto max-w-md text-sm text-gray-500">{t('Essayez une autre wilaya, un autre type de bien ou une fourchette de prix plus large.')}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {activeCount > 0 && (
                  <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> {t('Réinitialiser les filtres')}
                  </button>
                )}
                <Link href="/register?role=seller" className="inline-flex items-center gap-2 rounded-full border border-emerald-600 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
                  {t('Vendre mon bien')}
                </Link>
              </div>
            </div>
          ) : (
            <div className={view === 'map' ? 'grid gap-6 lg:grid-cols-[1fr_1.1fr]' : ''}>
              <div className={view === 'map' ? 'grid gap-5 sm:grid-cols-2 lg:max-h-[75vh] lg:overflow-y-auto lg:pe-2' : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'}>
                {listings.map((l) => (
                  <SaleCard key={l._id} listing={l} contact={contact} t={t} active={activeId === l._id} onHover={setActiveId} />
                ))}
              </div>
              {view === 'map' && (
                <div className="h-[60vh] overflow-hidden rounded-3xl border border-gray-100 shadow-sm lg:sticky lg:top-24 lg:h-[75vh]">
                  <HotelsMap hotels={mapItems} activeHotelId={activeId} onHotelHover={setActiveId} />
                </div>
              )}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-12 flex justify-center gap-2" aria-label={t('Pagination')}>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-current={page === p ? 'page' : undefined}
                  className={`h-11 w-11 rounded-full text-sm font-bold transition ${page === p ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-600'}`}>
                  {p}
                </button>
              ))}
            </nav>
          )}

          {/* Mortgage simulator teaser */}
          <aside className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-emerald-600 p-8 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">{t('Combien vais-je payer par mois ?')}</h2>
              <p className="mt-1 text-sm text-white/85">{t('Simulez votre crédit immobilier en dinars : mensualité, coût total et revenu nécessaire.')}</p>
            </div>
            <Link href="/outils/simulateur-credit-immobilier" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
              <Calculator className="h-4 w-4" aria-hidden="true" /> {t('Simuler mon crédit')}
            </Link>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SaleCard({ listing: l, contact, t, active, onHover }) {
  const isNew = l.createdAt && Date.now() - new Date(l.createdAt) < NEW_DAYS * 86400000;
  const perM2 = l.area > 0 ? Math.round(l.price / l.area) : 0;
  // Meskan is the intermediary: the buttons call Meskan, the seller's number stays private
  const phone = contact?.phone || '';
  const wa = whatsappNumber(phone);
  const monthly = estimateMonthly(l.price);
  const waText = encodeURIComponent(`${t('Bonjour, je vous contacte au sujet de :')} ${l.title} (${l.reference || ''})`);

  return (
    <article
      onMouseEnter={() => onHover?.(l._id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${active ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-gray-100'}`}
    >
      <Link href={`/sales/${l._id}`} className="relative block h-52 overflow-hidden bg-gray-100">
        {l.images?.[0] ? (
          <img src={getImageUrl(l.images[0].url)} alt={l.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300"><Home className="h-12 w-12" /></div>
        )}
        <div className="absolute start-3 top-3 flex gap-1.5">
          {isNew && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-900">{t('Nouveau')}</span>}
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{t(l.type)}</span>
        </div>
        {l.reference && <span className="absolute end-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white" dir="ltr">{l.reference}</span>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
          <p className="text-2xl font-extrabold text-white">{formatDZD(l.price, l.currency)}</p>
          {perM2 > 0 && <p className="text-xs font-semibold text-white/85">{formatDZD(perM2, l.currency)} / {t('m²')}</p>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/sales/${l._id}`} className="mb-1 truncate text-lg font-bold text-gray-900 transition group-hover:text-emerald-700">{l.title}</Link>
        <p className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
          <span className="truncate">{t(l.city)}{l.wilaya && l.wilaya !== l.city ? `, ${t(l.wilaya)}` : ''}</span>
        </p>

        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          {l.area > 0 && <li className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 text-gray-400" aria-hidden="true" />{l.area} {t('m²')}</li>}
          {l.rooms > 0 && <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-gray-400" aria-hidden="true" />F{l.rooms}</li>}
          {l.bathrooms > 0 && <li className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-gray-400" aria-hidden="true" />{l.bathrooms}</li>}
        </ul>

        {monthly > 0 && (
          <Link href={`/outils/simulateur-credit-immobilier?price=${l.price}`} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            {t('≈ {amount} / mois avec un crédit', { amount: formatDZD(Math.round(monthly / 100) * 100, l.currency) })}
          </Link>
        )}

        {(phone || wa) && (
          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-emerald-400 hover:text-emerald-700">
                <Phone className="h-4 w-4" aria-hidden="true" /> {t('Appeler')}
              </a>
            )}
            {wa && (
              <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1fb857]">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
