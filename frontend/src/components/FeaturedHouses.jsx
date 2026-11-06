'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/LocaleLink';
import { Home, ChevronLeft, ChevronRight, MapPin, BedDouble, Bath, Users, Plus } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import FavoriteButton from '@/components/FavoriteButton';

import { getServerURL } from '@/lib/api';
import { useT } from '@/lib/i18n/useT';
import { placeName } from '@/hooks/useCommunes';
import { formatDZD } from '@/lib/data';

const SERVER = getServerURL();
function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${SERVER}${url}`;
}


export default function FeaturedHouses({ selectedCity }) {
  const [houses, setHouses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const scroller = { current: null };
  const user = useAuthStore((s) => s.user);
  const { t, lang } = useT();
  const isOwner = user?.role === 'owner';

  // Newest approved houses, filtered by the selected wilaya on the server
  useEffect(() => {
    const params = { limit: 6, sort: 'newest' };
    if (selectedCity) params.place = selectedCity; // wilaya or commune
    api.get('/houses', { params })
      .then(({ data }) => setHouses(data.houses || []))
      .catch(() => setHouses([]))
      .finally(() => setLoaded(true));
  }, [selectedCity]);

  const filteredHouses = houses;

  const scroll = (dir) => {
    const el = document.getElementById('houses-scroller');
    el?.scrollBy({ left: dir * 380, behavior: 'smooth' });
  };

  if (loaded && houses.length === 0 && !selectedCity) return null;

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 48, height: 48,
            borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff',
            boxShadow: '0 4px 14px rgba(15,23,42,0.25)'
          }}>
            <Home size={22} />
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>{selectedCity && lang !== 'ar' ? t('Maisons à louer · {selectedCity}', { selectedCity }) : t.featuredHouses}</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0' }}>{t.featuredHousesSubtitle}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOwner && (
            <Link href="/owner/my-houses?new=1" style={{
              display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '8px 20px', fontSize: 13, fontWeight: 700,
              color: '#fff', textDecoration: 'none', boxShadow: '0 4px 14px rgba(15,23,42,0.25)'
            }}>
              <Plus size={15} /> {t.becomeOwner}
            </Link>
          )}
          <Link href="/houses" style={{
            display: 'flex', alignItems: 'center', gap: 4, borderRadius: 999,
            border: '1px solid #e2e8f0', background: '#fff', padding: '8px 20px',
            fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none'
          }}>
            {t.seeAll} <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => scroll(-1)}
          style={{
            position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, width: 40, height: 40, borderRadius: '50%',
            background: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            cursor: 'pointer', display: 'grid', placeItems: 'center'
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <div
          id="houses-scroller"
          style={{
            display: 'flex', gap: 20, overflowX: 'auto', scrollBehavior: 'smooth',
            paddingBottom: 8, scrollSnapType: 'x mandatory',
          }}
          className="no-scrollbar"
        >
          {filteredHouses.length > 0 ? (
            filteredHouses.map((h) => {
              const rawImg = h.images?.[0]?.url || h.img || null;
              const img = resolveImg(rawImg) || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80';
              const price = h.pricePerNight ?? h.price ?? 0;
              return (
                <div
                  key={h._id || h.id}
                  style={{
                    position: 'relative', height: 288, width: 320, flexShrink: 0,
                    borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'start',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                  className="group"
                >
                  <Link href={`/houses/${h._id || h.id}`} className="absolute inset-0 block text-none">
                    <img src={img} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="group-hover:scale-105" />
                    {/* Type badge */}
                    <span style={{
                      position: 'absolute', top: 12, left: 12,
                      background: 'rgba(15,23,42,0.9)', color: '#fff',
                      borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700
                    }}>
                      {t(h.type || 'Maison')}
                    </span>
                    {/* Details overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
                      padding: '0 16px 16px'
                    }}>
                      <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{h.name}</h3>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#e2e8f0', margin: '0 0 8px' }}>
                          <MapPin size={14} /> {t(h.city)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#cbd5e1' }}>
                            {h.rooms && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><BedDouble size={13} /> {h.rooms} {t('ch.')}</span>}
                            {h.capacity && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={13} /> {h.capacity} {t('pers.')}</span>}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#cbd5e1' }}>
                            {price > 0 ? formatDZD(price, h.currency) : '—'}
                            <span style={{ fontWeight: 400, fontSize: 11 }}>{t('/nuit')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {/* Favorite Button */}
                  <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                    <FavoriteButton type="house" id={h._id || h.id} />
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>{t('Aucune maison à louer pour «')} {placeName(selectedCity, lang)} {t('» pour le moment.')}</p>
          )}
        </div>

        <button
          onClick={() => scroll(1)}
          style={{
            position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, width: 40, height: 40, borderRadius: '50%',
            background: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            cursor: 'pointer', display: 'grid', placeItems: 'center'
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
