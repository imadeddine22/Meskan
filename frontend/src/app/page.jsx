'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CategoryCards from '@/components/CategoryCards';
import FeaturedHotels from '@/components/FeaturedHotels';
import ReelsTeaser from '@/components/ReelsTeaser';
import FeaturedHouses from '@/components/FeaturedHouses';
import FeaturedSales from '@/components/FeaturedSales';
import CitiesSection from '@/components/CitiesSection';
import HotelsList from '@/components/HotelsList';
import PlaceProjects from '@/components/PlaceProjects';
import HomeDetailsSection from '@/components/HomeDetailsSection';
import InvestTeaser from '@/components/InvestTeaser';
import Footer from '@/components/Footer';
import { findWilaya, placeName } from '@/hooks/useCommunes';

import { useT } from '@/lib/i18n/useT';
export default function HomePage() {
  const { t, lang } = useT();
  // Wilaya or commune typed in the hero search / picked in the city cards
  const [place, setPlaceRaw] = useState('');
  // 'tlemcen' / 'Bejaia' → official spelling ('Tlemcen', 'Béjaïa'); communes are kept as typed
  const setPlace = (v) => setPlaceRaw(findWilaya(v)?.name || v);
  // Wilaya picked in the "explore by wilaya" row: filters the home sections without changing the layout
  const [pick, setPick] = useState('');

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero value={place} onSearch={setPlace} />

      {place ? (
        <>
          {/* Search active: show what is available there first — hotels, then houses, then sales */}
          <div id="search-results" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white px-5 py-4 shadow-sm" aria-live="polite">
              <p className="text-sm text-gray-600">
                {t('Résultats pour')} <strong className="text-ink">« {placeName(place, lang)} »</strong> {t(': hôtels, maisons à louer, biens à vendre et projets.')}
              </p>
              <button
                onClick={() => setPlace('')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" aria-hidden="true" /> {t('Effacer la recherche')}
              </button>
            </div>
          </div>
          <CitiesSection selectedCity={place} onSelectCity={setPlace} />
          <HotelsList selectedCity={place} onSelectCity={setPlace} />
          <FeaturedHouses selectedCity={place} />
          <FeaturedSales selectedCity={place} />
          <PlaceProjects selectedCity={place} />
        </>
      ) : (
        <>
          {/* right under the hero: hotels, rentals, sales, real estate, investment */}
          <CategoryCards />
          <FeaturedHotels />
          <ReelsTeaser />
          {/* a wilaya picked in the row filters the sections below in place (same layout, no jump) */}
          <CitiesSection selectedCity={pick} onSelectCity={setPick} />
          <FeaturedHouses selectedCity={pick} />
          <FeaturedSales selectedCity={pick} />
          <PlaceProjects selectedCity={pick} />
          <HotelsList selectedCity={pick} onSelectCity={setPick} />
        </>
      )}

      <HomeDetailsSection />
      <InvestTeaser />
      <Footer />
    </main>
  );
}
