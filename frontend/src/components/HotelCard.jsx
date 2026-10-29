'use client';

import Link from '@/components/LocaleLink';
import { MapPin, Star, ThumbsUp, Bed, ChevronRight, Check } from 'lucide-react';
import { formatDZD } from '@/lib/data';
import FavoriteButton from '@/components/FavoriteButton';
import { getImageUrl } from '@/lib/api';

import { useT } from '@/lib/i18n/useT';
import ApproxPrice from '@/components/ApproxPrice';
import { PolicyBadges } from '@/components/Policies';
import { ScoreBadge, DealPrice } from '@/components/Score';
export default function HotelCard({ hotel, list = false, onHover }) {
  const { t } = useT();
  const rawImg = hotel.images?.[0]?.url || hotel.img || null;
  const imgSrc = getImageUrl(rawImg) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

  if (list) {
    return (
      <div
        onMouseEnter={() => onHover && onHover(hotel.id || hotel._id)}
        onMouseLeave={() => onHover && onHover(null)}
        className="group isolate flex flex-col md:flex-row overflow-hidden rounded-xl bg-white shadow-sm border border-brand-100 transition hover:shadow-md md:h-[240px] relative"
      >
        <Link
          href={`/hotels/${hotel.id || hotel._id}`}
          className="flex flex-col md:flex-row flex-1"
        >
          {/* Left: Image */}
          <div className="relative h-48 md:h-full w-full md:w-[280px] shrink-0">
            <img
              src={imgSrc}
              alt={hotel.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            {hotel.rating >= 8 && hotel.reviews > 0 && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-black/40 backdrop-blur-md px-2 py-1 text-xs font-bold text-white">
                <ThumbsUp className="h-3.5 w-3.5" /> {t('RECOMMENDED')}
              </div>
            )}
          </div>

          {/* Middle: Details */}
          <div className="flex flex-1 flex-col justify-between p-4 px-5 border-b md:border-b-0 md:border-r border-gray-100">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-600">
                <Star className="h-3.5 w-3.5" /> {t(hotel.type)}
              </div>
              <h3 className="text-xl font-extrabold text-ink leading-tight">{hotel.name}</h3>
              <PolicyBadges policies={hotel.policies} className="mt-1.5" />
              
              <ScoreBadge score={hotel.rating} count={hotel.reviews} className="mt-3" />
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {t(hotel.city)}</p>
              {hotel.price > 0 && (
                <p className="text-sm text-gray-500">
                  {t('À partir de')} <DealPrice price={hotel.price} original={hotel.originalPrice} discountPercent={hotel.discountPercent} currency={hotel.currency} className="text-lg font-extrabold text-brand-600" /> {t('/ nuit')}
                  <ApproxPrice amount={hotel.price} currency={hotel.currency} className="block text-xs text-gray-400" />
                </p>
              )}
            </div>
          </div>

          {/* Right: Amenities & Action */}
          <div className="flex w-full md:w-[220px] shrink-0 flex-col bg-gray-50/50">
            <div className="flex-1 p-4 pb-0">
              <h4 className="font-bold text-ink mb-3 text-sm">{t('Équipements')}</h4>
              <ul className="flex flex-col gap-2.5 text-sm font-medium text-gray-600">
                <li className="flex items-center gap-2.5"><Bed className="h-4 w-4 text-gray-400" /> {t('Lodging')}</li>
                {hotel.amenities?.slice(0, 4).map((am, i) => (
                  <li key={i} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-gray-400" /> {t(am)}</li>
                ))}
              </ul>
            </div>
            
            <div className="p-4 mt-auto">
               <div className="w-full flex items-center justify-center gap-2 rounded bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600">
                  {t('Voir les chambres')} <ChevronRight className="h-4 w-4" />
               </div>
            </div>
          </div>
        </Link>
        <div className="absolute right-3 top-3 z-20">
          <FavoriteButton type="hotel" id={hotel.id || hotel._id} className="bg-white/80 hover:bg-white" />
        </div>
      </div>
    );
  }

  // Grid view (original)
  return (
    <div
      className="group isolate overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-1 relative"
    >
      <Link href={`/hotels/${hotel.id || hotel._id}`} className="block">
        <div className="relative h-52 w-full">
          <img
            src={imgSrc}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-amber-600 shadow">
            {hotel.stars} ★
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-lg font-bold text-ink">{hotel.name}</h3>
          <PolicyBadges policies={hotel.policies} className="mt-1" />
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4 text-brand-500" /> {t(hotel.city)}
            <span className="text-gray-300">•</span>
            <span>{t(hotel.type)}</span>
          </p>

          <ScoreBadge score={hotel.rating} count={hotel.reviews} className="mt-3" />

          <div className="mt-auto pt-4">
            {hotel.price > 0 ? (
              <>
                <span className="text-xs text-gray-500">{t('À partir de')} </span>
                <DealPrice price={hotel.price} original={hotel.originalPrice} discountPercent={hotel.discountPercent} currency={hotel.currency} />
                <span className="text-sm text-gray-400"> {t('/ nuit')}</span>
                <ApproxPrice amount={hotel.price} currency={hotel.currency} className="block text-xs text-gray-400" />
              </>
            ) : (
              <span className="text-sm font-semibold text-brand-600">{t('Voir les chambres')}</span>
            )}
          </div>
        </div>
      </Link>
      {(hotel.id || hotel._id) && (
        <div className="absolute left-3 top-3 z-20">
          <FavoriteButton type="hotel" id={hotel.id || hotel._id} />
        </div>
      )}
    </div>
  );
}
