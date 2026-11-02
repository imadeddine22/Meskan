'use client';

import { MapPin, Maximize2, BedDouble, Home } from 'lucide-react';
import Link from '@/components/LocaleLink';
import { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { useT } from '@/lib/i18n/useT';

/** Compact card of a property for sale (wilaya pages): photo, type, displayed price, place, area and rooms. */
export default function SaleListingCard({ listing: l }) {
  const { t } = useT();
  const img = getImageUrl(l.images?.[0]?.url);
  return (
    <Link href={`/sales/${l._id}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {img ? (
          <img src={img} alt={l.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-gray-300"><Home className="h-10 w-10" aria-hidden="true" /></div>
        )}
        <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{t(l.type)}</span>
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-lg font-extrabold text-white">{formatDZD(l.price, l.currency)}</p>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-bold text-gray-900" dir="auto">{l.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" /> {t(l.city)}
        </p>
        <p className="mt-2 flex gap-4 text-sm text-gray-600">
          {l.area > 0 && <span className="flex items-center gap-1"><Maximize2 className="h-4 w-4 text-gray-400" aria-hidden="true" /> {l.area} {t('m²')}</span>}
          {l.rooms > 0 && <span className="flex items-center gap-1"><BedDouble className="h-4 w-4 text-gray-400" aria-hidden="true" /> F{l.rooms}</span>}
        </p>
      </div>
    </Link>
  );
}
