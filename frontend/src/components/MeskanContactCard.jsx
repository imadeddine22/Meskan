'use client';

import { Phone, MessageCircle, MessagesSquare, ShieldCheck } from 'lucide-react';
import Link from '@/components/LocaleLink';
import { useT } from '@/lib/i18n/useT';

/** "0555 12 34 56" → "+213555123456" (other countries: kept as typed). */
const intlPhone = (raw = '') => {
  const d = String(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (d.startsWith('00')) return `+${d.slice(2)}`;
  if (d.startsWith('0')) return `+213${d.slice(1)}`;
  return d;
};

/**
 * Contact block of a listing. Meskan is the intermediary between guests and owners, buyers and sellers:
 * visitors call or write to Meskan, never to the publisher (whose contact stays private).
 * `contact`: Meskan's { phone, email } from the API; `about`: what the visitor is asking about (listing title + ref).
 */
export default function MeskanContactCard({ contact = {}, about = '', className = '' }) {
  const { t } = useT();
  const phone = contact?.phone;
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink">{t('Meskan — intermédiaire')}</p>
          <p className="text-xs text-gray-500">{t('Nous vous mettons en relation en toute confidentialité.')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {phone && (
          <>
            <a href={`tel:${intlPhone(phone)}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Phone className="h-4 w-4" aria-hidden="true" /> {t('Appeler')}
            </a>
            <a
              href={`https://wa.me/${intlPhone(phone).replace('+', '')}?text=${encodeURIComponent(about ? `${t('Bonjour, je vous contacte au sujet de :')} ${about}` : t('Bonjour'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1fb857]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
          </>
        )}
        <Link
          href={`/messages${about ? `?about=${encodeURIComponent(about)}` : ''}`}
          className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
        >
          <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t('Écrire à Meskan')}
        </Link>
      </div>
    </div>
  );
}
