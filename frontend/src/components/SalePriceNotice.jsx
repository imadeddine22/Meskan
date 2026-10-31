'use client';

import { BadgeInfo } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { formatDZD } from '@/lib/data';

// Same rate as MESKAN_SALE_RATE on the backend (HouseForSale model)
export const MESKAN_SALE_RATE = 0.01;
export const displayedSalePrice = (sellerPrice) => Math.round(Number(sellerPrice) * (1 + MESKAN_SALE_RATE));

/**
 * Under the price field of a sale listing: Meskan adds 1 % to the seller's price automatically,
 * and the seller sees the price buyers will see.
 */
export default function SalePriceNotice({ price, currency = 'DZD', className = '' }) {
  const { t } = useT();
  const n = Number(price);
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`} role="note">
      <p className="flex items-center gap-1.5 font-bold">
        <BadgeInfo className="h-4 w-4 shrink-0" aria-hidden="true" /> {t('Meskan ajoute automatiquement 1 % à votre prix')}
      </p>
      <p className="mt-1">{t('Indiquez votre prix : le prix affiché aux acheteurs comprend en plus 1 % pour Meskan.')}</p>
      {n > 0 && (
        <p className="mt-1.5 font-semibold">
          {t('Votre prix :')} {formatDZD(n, currency)} → {t('Prix affiché :')} <span className="text-emerald-700">{formatDZD(displayedSalePrice(n), currency)}</span>
        </p>
      )}
    </div>
  );
}
