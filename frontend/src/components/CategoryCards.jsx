'use client';

import { ArrowUpRight, KeyRound, Hotel, Building2, Landmark } from 'lucide-react';
import Link from '@/components/LocaleLink';
import { useT } from '@/lib/i18n/useT';

// Brand colours (no white card): navy, turquoise, deep ink, ocean — alternated like a palette board
const THEMES = {
  navy: { bg: '#152A41', fg: '#ffffff', sub: 'rgba(255,255,255,0.72)', chip: 'rgba(255,255,255,0.35)', icon: '#0DD5C4' },
  teal: { bg: 'linear-gradient(150deg, #0DD5C4, #00B3D2)', fg: '#ffffff', sub: 'rgba(255,255,255,0.88)', chip: 'rgba(255,255,255,0.5)', icon: '#ffffff' },
  ink: { bg: '#0B1622', fg: '#ffffff', sub: 'rgba(255,255,255,0.7)', chip: 'rgba(255,255,255,0.3)', icon: '#0DD5C4' },
  ocean: { bg: 'linear-gradient(150deg, #0b4a5c, #00B3D2)', fg: '#ffffff', sub: 'rgba(255,255,255,0.85)', chip: 'rgba(255,255,255,0.45)', icon: '#ffffff' },
};

// Everything Meskan offers, each card opens its page
const CARDS = [
  { href: '/houses', chip: 'Location', title: 'Maisons à louer', text: 'À la journée, au mois ou à l’année : villas, appartements, chalets…', icon: KeyRound, theme: 'navy', offset: 'lg:mt-0' },
  { href: '/hotels', chip: 'Hôtels', title: 'Réservation d’hôtels', text: 'Réservez votre chambre dans les 69 wilayas, paiement sur place.', icon: Hotel, theme: 'teal', offset: 'lg:mt-24' },
  { href: '/sales', chip: 'Immobilier', title: 'Biens immobiliers à vendre', text: 'Appartements, villas, maisons, terrains et locaux commerciaux à acheter.', icon: Building2, theme: 'ink', offset: 'lg:mt-10' },
  { href: '/investir', chip: 'Investissement', title: 'Investissement', text: 'Projets et investisseurs mis en relation par Meskan, jusqu’à la signature.', icon: Landmark, theme: 'ocean', offset: 'lg:mt-32' },
];

/** Right under the home hero: what visitors can do on Meskan, each card linking to its page. */
export default function CategoryCards() {
  const { t } = useT();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6" aria-labelledby="categories-title">
      <h2 id="categories-title" className="mb-5 text-2xl font-black text-ink md:text-3xl">{t('Tout ce que vous trouverez sur Meskan')}</h2>
      {/* phone: swipe sideways; computer: four staggered cards */}
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:items-start lg:overflow-visible lg:px-0">
        {CARDS.map(({ href, chip, title, text, icon: Icon, theme, offset }) => {
          const c = THEMES[theme];
          return (
            <li key={href} className={`w-[72%] shrink-0 snap-start sm:w-[44%] lg:w-auto ${offset}`}>
              <Link
                href={href}
                className="group flex min-h-[300px] flex-col rounded-[2rem] p-6 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ background: c.bg, color: c.fg }}
              >
                <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: c.chip }}>
                  {t(chip)}
                </span>
                <Icon className="mt-auto h-8 w-8" style={{ color: c.icon }} aria-hidden="true" />
                <p className="mt-3 text-2xl font-black leading-tight">{t(title)}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: c.sub }}>{t(text)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
                  {t('Découvrir')} <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
