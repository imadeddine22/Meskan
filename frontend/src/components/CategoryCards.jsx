'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Handshake } from 'lucide-react';
import Link from '@/components/LocaleLink';
import { useT } from '@/lib/i18n/useT';

const img = (id) => `https://images.unsplash.com/${id}?w=700&q=70&auto=format`;

// What visitors can do on Meskan: each photo card opens its page
const CARDS = [
  { href: '/houses', photo: img('photo-1564013799919-ab600027ffc6'), badge: 'Au jour, au mois ou à l’année', title: 'Maisons à louer', sub: 'Villas, appartements, chalets', foot: 'Dans les 69 wilayas', footIcon: MapPin },
  { href: '/hotels', photo: img('photo-1566073771259-6a8506099945'), badge: 'Paiement sur place', title: 'Réservation d’hôtels', sub: 'Chambres dans toute l’Algérie', foot: 'Dans les 69 wilayas', footIcon: MapPin },
  { href: '/sales', photo: img('photo-1600585154526-990dced4db0d'), badge: 'Annonces vérifiées', title: 'Biens immobiliers à vendre', sub: 'Appartements, villas, terrains, locaux', foot: 'Partout en Algérie', footIcon: MapPin },
  { href: '/investir', photo: img('photo-1500382017468-9049fed747ef'), badge: '2 % seulement si la transaction aboutit', title: 'Investissement', sub: 'Projets et investisseurs réunis par Meskan', foot: 'Accompagnement jusqu’à la signature', footIcon: Handshake },
];

/**
 * Right under the home hero: the site's sections as photo cards in a light panel
 * (title and text on top, "view more" and arrows below). Phones swipe; the arrows scroll when cards overflow.
 */
export default function CategoryCards() {
  const { t } = useT();
  const row = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false, overflow: false });

  // which arrows make sense: none when the four cards fit (large screens)
  const measure = () => {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft); // negative in RTL
    setEdges({ start: pos <= 8, end: pos >= max - 8, overflow: max > 8 }); // 8px: the row's small inner padding
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scroll = (dir) => {
    const el = row.current;
    if (!el) return;
    const step = (el.firstElementChild?.getBoundingClientRect().width || 300) + 16;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * step * (rtl ? -1 : 1), behavior: calm ? 'auto' : 'smooth' });
    setTimeout(measure, 450); // arrows stay right even if no scroll event arrives
  };

  const arrow = 'grid h-11 w-11 place-items-center rounded-full border border-[#152A41]/70 text-[#152A41] transition hover:bg-[#152A41] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B3D2] disabled:pointer-events-none disabled:opacity-30';

  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6" aria-labelledby="categories-title">
      <div className="rounded-[2rem] bg-[#EEF2F6] p-5 sm:p-8">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-10">
          <h2 id="categories-title" className="text-2xl font-black text-[#152A41] md:text-3xl">{t('Tout ce que vous trouverez sur Meskan')}</h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-600 md:text-base">
            {t('Hôtels, locations, ventes et investissement dans les 69 wilayas : choisissez ce que vous cherchez.')}
          </p>
        </div>

        <ul ref={row} onScroll={measure} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1">
          {CARDS.map(({ href, photo, badge, title, sub, foot, footIcon: FootIcon }) => (
            <li key={href} className="w-[78%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
              <Link
                href={href}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00B3D2]/60"
              >
                <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                {/* readable text over any photo */}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0B1622]/90 via-[#0B1622]/25 to-transparent" />
                <span className="absolute end-3 top-3 max-w-[85%] rounded-full bg-white/85 px-3 py-1 text-[11px] font-bold text-[#152A41] backdrop-blur">
                  {t(badge)}
                </span>
                <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="block text-xl font-black leading-tight">{t(title)}</span>
                  <span className="mt-1 block text-sm text-white/85">{t(sub)}</span>
                  <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/90">
                    <FootIcon className="h-4 w-4 shrink-0 text-[#0DD5C4]" aria-hidden="true" /> {t(foot)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Link href="/destinations" className="inline-flex min-h-[44px] items-center rounded-full bg-[#152A41] px-6 text-sm font-bold text-white transition hover:bg-[#0B1622] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B3D2]">
            {t('Voir les destinations')}
          </Link>
          {edges.overflow && (
            <div className="flex gap-2">
              <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={t('Précédent')} className={arrow}>
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={t('Suivant')} className={arrow}>
                <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
