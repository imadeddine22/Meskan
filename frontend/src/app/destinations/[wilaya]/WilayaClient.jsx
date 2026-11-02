'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Hotel, Home, MapPin, ArrowLeft, Loader2, Tag, Landmark } from 'lucide-react';
import Link from '@/components/LocaleLink';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HotelCard from '@/components/HotelCard';
import HouseCard from '@/components/HouseCard';
import SaleListingCard from '@/components/SaleListingCard';
import ProjectCard from '@/components/ProjectCard';
import api from '@/lib/api';

import { useT } from '@/lib/i18n/useT';
const HOTEL_TYPES = ['Luxe', 'Affaires', 'Balnéaire', 'Riad', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'];
const HOUSE_TYPES = ['Villa', 'Appartement', 'Maison', 'Chalet', 'Studio', 'Duplex', 'Riad', 'Ferme'];

export default function WilayaClient({ wilayaName, children }) {
  const { t } = useT();

  const [hotels, setHotels] = useState([]);
  const [houses, setHouses] = useState([]);
  const [sales, setSales] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | hotels | houses | sales | projects
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');

  // Fetch hotels & houses for this wilaya
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // everything published in this wilaya: hotels, rentals, sales, and investment projects (both kinds)
        const [hotelsRes, housesRes, salesRes, assetsRes, capitalRes] = await Promise.all([
          api.get('/hotels', { params: { wilaya: wilayaName, limit: 50 } }).catch(() => ({ data: { hotels: [] } })),
          api.get('/houses', { params: { wilaya: wilayaName, limit: 50 } }).catch(() => ({ data: { houses: [] } })),
          api.get('/sales', { params: { wilaya: wilayaName, limit: 50 } }).catch(() => ({ data: { listings: [] } })),
          api.get('/projects', { params: { wilaya: wilayaName, limit: 50 } }).catch(() => ({ data: { projects: [] } })),
          api.get('/projects', { params: { wilaya: wilayaName, kind: 'capital', limit: 50 } }).catch(() => ({ data: { projects: [] } })),
        ]);
        setHotels(hotelsRes.data.hotels || []);
        setHouses(housesRes.data.houses || []);
        setSales(salesRes.data.listings || []);
        setProjects([...(assetsRes.data.projects || []), ...(capitalRes.data.projects || [])]);
      } catch {
        setHotels([]);
        setHouses([]);
        setSales([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [wilayaName]);

  // Normalize hotel for HotelCard
  const normalizeHotel = (h) => ({
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

  // Normalize house for HouseCard
  const normalizeHouse = (h) => ({
    _id: h._id || h.id,
    name: h.name,
    city: h.city,
    wilaya: h.wilaya,
    type: h.type,
    rooms: h.rooms,
    bathrooms: h.bathrooms,
    capacity: h.capacity,
    pricePerNight: h.pricePerNight ?? h.price ?? 0,
    rentalPeriod: h.rentalPeriod, pricePerMonth: h.pricePerMonth, pricePerYear: h.pricePerYear,
    discountPercent: h.discountPercent || 0, discountUntil: h.discountUntil || null, avgRating: h.avgRating || 0, reviewsCount: h.reviewsCount || 0,
    currency: h.currency || 'DZD',
  policies: h.policies,
    images: h.images || (h.img ? [{ url: h.img }] : []),
  });

  // Current types based on tab
  const currentTypes = useMemo(() => {
    if (tab === 'hotels') return HOTEL_TYPES;
    if (tab === 'houses') return HOUSE_TYPES;
    return [...new Set([...HOTEL_TYPES, ...HOUSE_TYPES])];
  }, [tab]);

  // Filtered results
  const only = (k) => tab !== 'all' && tab !== k; // another tab is selected
  const filteredHotels = useMemo(() => {
    if (only('hotels')) return [];
    let list = hotels;
    if (typeFilter) list = list.filter((h) => h.type === typeFilter);
    if (searchQ) list = list.filter((h) => h.name.toLowerCase().includes(searchQ.toLowerCase()));
    return list;
  }, [hotels, tab, typeFilter, searchQ]);

  const filteredHouses = useMemo(() => {
    if (only('houses')) return [];
    let list = houses;
    if (typeFilter) list = list.filter((h) => h.type === typeFilter);
    if (searchQ) list = list.filter((h) => h.name.toLowerCase().includes(searchQ.toLowerCase()));
    return list;
  }, [houses, tab, typeFilter, searchQ]);

  const q = searchQ.toLowerCase();
  const filteredSales = useMemo(() => (only('sales') || typeFilter ? [] : sales.filter((l) => !q || l.title?.toLowerCase().includes(q))), [sales, tab, typeFilter, q]);
  const filteredProjects = useMemo(() => (only('projects') || typeFilter ? [] : projects.filter((p) => !q || p.title?.toLowerCase().includes(q))), [projects, tab, typeFilter, q]);

  const totalResults = filteredHotels.length + filteredHouses.length + filteredSales.length + filteredProjects.length;

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />

      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 40%, #22d3ee 100%)',
          padding: '40px 24px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Back link */}
          <Link
            href="/destinations"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#cffafe', fontSize: 14, fontWeight: 600,
              textDecoration: 'none', marginBottom: 16,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#cffafe')}
          >
            <ArrowLeft size={16} /> {t('Toutes les wilayas')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                display: 'grid', placeItems: 'center', width: 48, height: 48,
                borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff',
              }}
            >
              <MapPin size={24} />
            </span>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: 0 }}>
                {t(wilayaName)}
              </h1>
              <p style={{ color: '#cffafe', fontSize: 14, marginTop: 4 }}>
                {loading ? t('Chargement...') : t('{h} hôtel(s) · {m} maison(s) · {s} bien(s) à vendre · {p} projet(s)', { h: hotels.length, m: houses.length, s: sales.length, p: projects.length })}
              </p>
            </div>
          </div>

          {/* Search */}
          <div
            style={{
              marginTop: 20,
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', borderRadius: 14,
              padding: '6px 6px 6px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              maxWidth: 500,
            }}
          >
            <Search size={18} color="#06b6d4" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={t('Rechercher dans cette wilaya...')}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 14,
                background: 'transparent', color: '#1e293b',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Tabs: Tous / Hôtels / Maisons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tous', icon: null, count: hotels.length + houses.length + sales.length + projects.length },
            { key: 'hotels', label: 'Hôtels', icon: Hotel, count: hotels.length },
            { key: 'houses', label: 'Locations', icon: Home, count: houses.length },
            { key: 'sales', label: 'Ventes', icon: Tag, count: sales.length },
            { key: 'projects', label: 'Investissement', icon: Landmark, count: projects.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setTypeFilter(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                borderRadius: 999, padding: '8px 18px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', border: 'none',
                transition: 'all 0.2s',
                background: tab === key ? '#06b6d4' : '#fff',
                color: tab === key ? '#fff' : '#64748b',
                boxShadow: tab === key ? '0 4px 14px rgba(6,182,212,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {Icon && <Icon size={15} />}
              {t(label)}
              <span
                style={{
                  fontSize: 12, fontWeight: 700,
                  background: tab === key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  padding: '1px 8px', borderRadius: 999,
                  color: tab === key ? '#fff' : '#94a3b8',
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Type filters (hotels and houses) */}
        {!['sales', 'projects'].includes(tab) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
          <SlidersHorizontal size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
          <button
            onClick={() => setTypeFilter('')}
            style={{
              borderRadius: 999, padding: '6px 14px', fontSize: 13,
              cursor: 'pointer', flexShrink: 0, fontWeight: 500, border: 'none',
              background: !typeFilter ? '#06b6d4' : '#fff',
              color: !typeFilter ? '#fff' : '#64748b',
              boxShadow: !typeFilter ? '0 2px 8px rgba(6,182,212,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {t('Tous les types')}
          </button>
          {currentTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              style={{
                borderRadius: 999, padding: '6px 14px', fontSize: 13,
                cursor: 'pointer', flexShrink: 0, fontWeight: 500, border: 'none',
                background: typeFilter === type ? '#06b6d4' : '#fff',
                color: typeFilter === type ? '#fff' : '#64748b',
                boxShadow: typeFilter === type ? '0 2px 8px rgba(6,182,212,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {t(type)}
            </button>
          ))}
        </div>}

        {/* Results count */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
          {loading ? t('Chargement...') : (
            <>
              {totalResults} {t(totalResults !== 1 ? 'résultats' : 'résultat')}
              {typeFilter && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {t(typeFilter)}</span>}
            </>
          )}
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>{t('Chargement des propriétés...')}</p>
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : totalResults === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <MapPin size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>{t('Aucune propriété trouvée à')} {t(wilayaName)}</p>
            <p style={{ fontSize: 14 }}>{t('Modifiez vos filtres ou revenez plus tard')}</p>
          </div>
        ) : (
          <>
            {/* Hotels section */}
            {filteredHotels.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                {tab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Hotel size={18} color="#06b6d4" />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {t('Hôtels')}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                        ({filteredHotels.length})
                      </span>
                    </h3>
                  </div>
                )}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 20,
                  }}
                >
                  {filteredHotels.map((h) => (
                    <HotelCard key={h._id || h.id} hotel={normalizeHotel(h)} />
                  ))}
                </div>
              </div>
            )}

            {/* Houses section */}
            {filteredHouses.length > 0 && (
              <div>
                {tab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Home size={18} color="#06b6d4" />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {t('Maisons')}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                        ({filteredHouses.length})
                      </span>
                    </h3>
                  </div>
                )}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 20,
                  }}
                >
                  {filteredHouses.map((h) => (
                    <HouseCard key={h._id || h.id} house={normalizeHouse(h)} />
                  ))}
                </div>
              </div>
            )}
            {filteredSales.length > 0 && (
              <div style={{ marginTop: 40 }}>
                {tab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Tag size={18} color="#06b6d4" />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {t('Biens à vendre')}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({filteredSales.length})</span>
                    </h3>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {filteredSales.map((x) => <SaleListingCard key={x._id} listing={x} />)}
                </div>
              </div>
            )}
            {filteredProjects.length > 0 && (
              <div style={{ marginTop: 40 }}>
                {tab === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Landmark size={18} color="#06b6d4" />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {t('Projets d’investissement')}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({filteredProjects.length})</span>
                    </h3>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {filteredProjects.map((x) => <ProjectCard key={x._id} project={x} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {children}

      <Footer />
    </main>
  );
}
