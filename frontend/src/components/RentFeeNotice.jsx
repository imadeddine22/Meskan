'use client';

import { BadgeInfo } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { formatDZD } from '@/lib/data';
import { RENT_FEES } from '@/lib/rentals';

/**
 * What Meskan takes when it finds a tenant for the house, shown to the owner where they publish it.
 * `period`: the rental type picked in the form (daily | monthly | yearly | monthly_yearly); without it, all the fees.
 */
export default function RentFeeNotice({ period, className = '' }) {
  const { t } = useT();
  const lines = [];
  if (!period || period === 'daily') lines.push(t('Location à la journée : aucun frais Meskan.'));
  if (!period || period === 'monthly' || period === 'monthly_yearly') {
    lines.push(t('Location au mois, moins de 7 mois : {fee}.', { fee: formatDZD(RENT_FEES.short) }));
    lines.push(t('Location au mois, 7 mois ou plus : {fee}.', { fee: formatDZD(RENT_FEES.long) }));
  }
  if (!period || period === 'yearly' || period === 'monthly_yearly') lines.push(t('Location à l’année : {fee}.', { fee: formatDZD(RENT_FEES.long) }));
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`} role="note">
      <p className="flex items-center gap-1.5 font-bold">
        <BadgeInfo className="h-4 w-4 shrink-0" aria-hidden="true" /> {t('Frais Meskan pour trouver votre locataire')}
      </p>
      <ul className="mt-1.5 list-disc space-y-0.5 ps-5">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p className="mt-1.5 text-xs text-amber-800">{t('Ces frais ne sont dus que si la location est conclue grâce à Meskan.')}</p>
    </div>
  );
}
