'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/LocaleLink';
import { Tag, ChevronLeft, ChevronRight, MapPin, BedDouble, ChevronRight as ArrowIcon, Plus } from 'lucide-react';
import api, { getImageUrl } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useT } from '@/lib/i18n/useT';
import { formatDZD } from '@/lib/data';
import { placeName } from '@/hooks/useCommunes';


export default function FeaturedSales({ selectedCity }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const { t, lang } = useT();

  // Newest approved sale listings, filtered by the selected wilaya on the server
  useEffect(() => {
    const params = { limit: 6, sort: 'newest' };
    if (selectedCity) params.place = selectedCity; // wilaya or commune
    api.get('/sales', { params })
      .then(({ data }) => setSales(data.listings || []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, [selectedCity]);

  const filteredSales = sales;

  const scroll = (dir) => {
    const el = document.getElementById('sales-scroller');
    el?.scrollBy({ left: dir * 380, behavior: 'smooth' });
  };

  if (!loading && sales.length === 0 && !selectedCity) return null;

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
            <Tag size={20} />
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {selectedCity && lang !== 'ar' ? t('Biens à vendre · {selectedCity}', { selectedCity }) : (t.featuredSales || t('Biens à Vendre'))}
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0' }}>
              {t.featuredSalesSubtitle || t('Achetez votre futur logement en Algérie')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={user ? '/seller/my-listings?new=1' : '/register?role=seller'} style={{
            display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999,
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            padding: '8px 20px', fontSize: 13, fontWeight: 700,
            color: '#fff', textDecoration: 'none', boxShadow: '0 4px 14px rgba(15,23,42,0.25)'
          }}>
            <Plus size={15} /> {t('Publier un bien')}
          </Link>
          <Link href="/sales" style={{
            display: 'flex', alignItems: 'center', gap: 4, borderRadius: 999,
            border: '1px solid #e2e8f0', background: '#fff', padding: '8px 20px',
            fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none'
          }}>
            {t.seeAll} <ArrowIcon size={16} />
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
          id="sales-scroller"
          style={{
            display: 'flex', gap: 20, overflowX: 'auto', scrollBehavior: 'smooth',
            paddingBottom: 8, scrollSnapType: 'x mandatory',
          }}
          className="no-scrollbar"
        >
          {filteredSales.length > 0 ? (
            filteredSales.map((item) => {
              const rawUrl = item.images?.[0]?.url;
              const img = rawUrl ? getImageUrl(rawUrl) : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80';
              const price = item.price || 0;
              return (
                <Link
                  key={item._id}
                  href={`/sales/${item._id}`}
                  style={{
                    position: 'relative', height: 288, width: 320, flexShrink: 0,
                    borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'start',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'block', textDecoration: 'none'
                  }}
                  className="group animate-scale-up"
                >
                  <img 
                    src={img} 
                    alt={t(item.title)} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} 
                    className="group-hover:scale-105"
                  />
                  {/* Type badge */}
                  <span style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(15,23,42,0.95)', color: '#fff',
                    borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700
                  }}>
                    {t(item.type || 'Maison')}
                  </span>
                  
                  {/* Details overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                    padding: '0 16px 16px'
                  }}>
                    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t(item.title)}
                      </h3>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#e2e8f0', margin: '0 0 8px' }}>
                        <MapPin size={14} className="text-slate-400" /> {t(item.city)}, {t(item.wilaya)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#cbd5e1' }}>
                          {item.area > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{item.area} {t('m²')}</span>}
                          {item.rooms > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><BedDouble size={13} /> {item.rooms} {t('p.')}</span>}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#cbd5e1' }}>
                          {formatDZD(price, item.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p style={{ padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
              {t('Aucun bien à vendre pour « {selectedCity} » pour le moment.', { selectedCity: placeName(selectedCity, lang) })}
            </p>
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
