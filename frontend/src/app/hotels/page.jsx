'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HotelCard from '@/components/HotelCard';
import api from '@/lib/api';
import { useWilayas } from '@/hooks/useWilayas';

import { useT } from '@/lib/i18n/useT';
import { useInitialData } from '@/components/InitialData';
import { COUNTRY_LIST, MULTI_COUNTRY, countryName } from '@/lib/countries';
import { regionsFor } from '@/hooks/useWilayas';
const TYPES = ['Luxe', 'Affaires', 'Balnéaire', 'Riad', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'];

export default function HotelsPage() {
  const { t, lang } = useT();
  const { wilayas } = useWilayas();
  const [filters, setFilters] = useState({ country: '', wilaya: '', type: '', minStars: '', q: '' });
  const initial = useInitialData();
  const [hotels, setHotels] = useState(initial?.hotels ?? []);
  const [loading, setLoading] = useState(!initial?.hotels);
  const [usingMock, setUsingMock] = useState(false);

  const silentFirstFetch = useRef(Boolean(initial));
  const fetchHotels = async () => {
    if (!silentFirstFetch.current) setLoading(true);
    silentFirstFetch.current = false;
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get('/hotels', { params });
      setHotels(data.hotels);
      setUsingMock(false);
    } catch {
      setHotels([]);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  // Honour /hotels?wilaya=… links (the home search and wilaya pages used to link here and were ignored)
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get('wilaya');
    if (w) setFilters((f) => ({ ...f, wilaya: w }));
  }, []);

  useEffect(() => {
    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.wilaya, filters.country]); // fetch automatically on filter change

  const normalize = (h) => ({
    id: h._id || h.id,
    name: h.name,
    city: h.city,
    type: h.type,
    stars: h.starRating ?? h.stars ?? 3,
    rating: h.avgRating ?? h.rating ?? 0,
    reviews: h.reviewsCount ?? h.reviews ?? 0,
    price: h.price ?? 0,
    originalPrice: h.originalPrice || null,
    discountPercent: h.discountPercent || 0,
    currency: h.currency || 'DZD',
    policies: h.policies,
    img: h.images?.[0]?.url || h.img,
    amenities: h.amenities || [],
    coordinates: h.coordinates || null,
  });

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-white">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* List: full width, content centred (the map was removed at the owner's request) */}
        <div className="flex w-full flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl">
          
          {/* Header & Filters (Sticky) */}
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
            <h1 className="mb-4 text-2xl font-extrabold text-ink">{t('Hôtels en Algérie')}</h1>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 focus-within:border-brand-500 focus-within:bg-white transition-colors">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && fetchHotels()}
                  placeholder={t('Rechercher une destination ou un hôtel...')}
                  className="w-full outline-none bg-transparent text-sm"
                />
              </div>

              {MULTI_COUNTRY && (
<select
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value, wilaya: '' })}
                aria-label={t('Pays')}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none hover:border-brand-300 transition-colors"
              >
                <option value="">{t('Tous les pays')}</option>
                {COUNTRY_LIST.map((c) => <option key={c.code} value={c.code}>{countryName(c.code, lang)}</option>)}
              </select>
)}

              <select
                value={filters.wilaya}
                onChange={(e) => setFilters({ ...filters, wilaya: e.target.value })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none hover:border-brand-300 transition-colors"
              >
                <option value="">{filters.country && filters.country !== 'DZ' ? t('Toutes les régions') : t('Toutes les wilayas')}</option>
                {regionsFor(filters.country, wilayas).map((w) => (
                  <option key={w} value={w}>{t(w)}</option>
                ))}
              </select>
            </div>

            {/* Type Filter Bar */}
            <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              <SlidersHorizontal className="mr-1 h-4 w-4 shrink-0 text-gray-400" />
              <button
                onClick={() => setFilters({ ...filters, type: '' })}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!filters.type ? 'bg-brand-500 text-white shadow-md' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {t('Tous')}
              </button>
              {TYPES.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilters({ ...filters, type: item })}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filters.type === item ? 'bg-[#00bcd4] text-white shadow-md' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {t(item)}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          <div className="p-4 sm:p-6 bg-gray-50/30 flex-1">
            {usingMock && (
              <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 border border-amber-100">
                {t('Impossible de charger les hôtels pour le moment. Vérifiez votre connexion et réessayez.')}
              </p>
            )}

            <h2 className="mb-4 text-lg font-bold text-ink flex items-center gap-2">
              {t('Résultats de recherche')} <span className="rounded bg-brand-50 px-2 py-0.5 text-sm text-brand-600">{hotels.length} {t('propriétés')}</span>
            </h2>

            {loading ? (
              <p className="py-10 text-center text-gray-400">{t('Recherche en cours...')}</p>
            ) : hotels.length === 0 ? (
              <p className="py-10 text-center text-gray-400">{t('Aucun hôtel trouvé pour ces critères.')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {hotels.map((h) => (
                  <HotelCard 
                    key={h._id || h.id} 
                    hotel={normalize(h)}
                  />
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
