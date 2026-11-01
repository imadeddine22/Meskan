'use client';

import { PencilLine } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

/**
 * An approved listing its owner edited since: still online, the admin checks the changes.
 * Admin pages: "to check"; `owner` (the owner's own space): reassures that it is still online.
 */
export default function ChangedBadge({ item, owner = false, className = '' }) {
  const { t } = useT();
  if (!item?.changesToReview || item.status !== 'approved') return null;
  if (owner) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ${className}`}>
        <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> {t('En ligne — modifications en cours de vérification')}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 ${className}`}
      title={item.changedAt ? new Date(item.changedAt).toLocaleString() : undefined}
    >
      <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> {t('Modifié — à vérifier')}
    </span>
  );
}
