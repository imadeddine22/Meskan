'use client';

import { ArrowRight, FileText, ShieldCheck, MapPin, ChartNoAxesCombined, Sprout } from 'lucide-react';
import Link from '@/components/LocaleLink';
import BrandLogo from '@/components/BrandLogo';
import { useT } from '@/lib/i18n/useT';

// Brand colours (same as the /investir pages)
const INK = '#152A41';
const TEAL = '#0CB2AE';

// Photos of the picture side: farmland (back) and a property (front)
const FARMLAND = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=70';
const PROPERTY = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=70';

const FEATURES = [
  { icon: FileText, label: 'Des choix variés pour tous' },
  { icon: ShieldCheck, label: 'Un cadre sûr et fiable' },
  { icon: MapPin, label: 'Des emplacements stratégiques en Algérie' },
  { icon: ChartNoAxesCombined, label: 'Des opportunités prometteuses' },
];

/**
 * Home page, before the footer: invitation to the investment section (/investir).
 * Text and logo are live (translated); the picture side is two overlapping photos (farmland +
 * a property) with a teal card, as in the designer's mock-up.
 */
export default function InvestTeaser() {
  const { t } = useT();

  return (
    <section aria-labelledby="invest-teaser-title" className="relative mt-16 overflow-hidden">
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 xl:gap-24 lg:py-20">
        {/* Text: second column on large screens (the picture comes first) */}
        <div className="flex flex-col lg:order-2 lg:mt-16">
          <div className="flex justify-center">
            <BrandLogo className="h-12 md:h-14" textClassName="text-4xl md:text-5xl !text-[#152A41]" alt="" />
          </div>

          <h2 id="invest-teaser-title" className="mt-6 text-center text-3xl font-black leading-[1.2] lg:text-start lg:text-[2.1rem] xl:text-[2.6rem]" style={{ color: INK }}>
            <span className="block">{t('Découvrez votre opportunité')}</span>
            <span className="block">
              <span style={{ color: TEAL }}>{t('d’investissement')}</span> {t('en Algérie')}
            </span>
          </h2>

          <p className="mt-4 text-center text-sm text-slate-600 md:text-base lg:text-start">
            {t('Terrains, locaux commerciaux et projets d’investissement prometteurs vous attendent.')}{' '}
            {t('Meskan s’occupe de toutes les démarches jusqu’à la signature.')}
          </p>

          <span aria-hidden="true" className="mt-7 hidden h-1 w-20 self-start rounded-full lg:block" style={{ background: TEAL }} />

          {/* 4 points, separated by thin teal lines */}
          <ul className="mt-8 grid grid-cols-2 gap-y-6 sm:grid-cols-4 lg:mt-6">
            {FEATURES.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className={`flex flex-col items-center gap-2 px-2 text-center ${i % 2 ? 'border-s-2' : ''} ${i === 2 ? 'sm:border-s-2' : ''}`}
                style={{ borderColor: `${TEAL}55` }}
              >
                <Icon className="h-8 w-8" style={{ color: INK }} strokeWidth={1.6} aria-hidden="true" />
                <span className="text-xs font-semibold leading-snug md:text-sm" style={{ color: INK }}>{t(label)}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/investir"
            className="mt-10 inline-flex items-center justify-center gap-3 self-center rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03] hover:shadow-xl md:text-base lg:self-start"
            style={{ background: INK }}
          >
            {t('Découvrez les opportunités d’investissement')}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" style={{ color: TEAL }} aria-hidden="true" />
          </Link>
        </div>

        {/* Two photos, as in the design: farmland at the back, a property in front,
            and a teal card */}
        <div className="relative mx-auto w-full max-w-[560px] lg:order-1" dir="ltr">
          <img src="/brand/meskan-mark.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-6 end-6 h-48 w-auto opacity-[0.05]" />
          <img src="/brand/meskan-mark.png" alt="" aria-hidden="true" className="pointer-events-none absolute -left-6 -top-6 h-40 w-auto opacity-[0.05]" />

          <div className="relative aspect-[1/0.92]">
            {/* farmland (back) */}
            <div className="absolute left-[6%] top-0 h-[74%] w-[62%] overflow-hidden rounded-[1.75rem] shadow-xl">
              <img src={FARMLAND} alt={t('Terre agricole à investir')} loading="lazy" className="h-full w-full object-cover" />
            </div>
            {/* property (front) */}
            <div className="absolute bottom-0 right-0 h-[52%] w-[58%] overflow-hidden rounded-[1.75rem] border-[6px] border-white shadow-2xl">
              <img src={PROPERTY} alt={t('Bien immobilier à investir')} loading="lazy" className="h-full w-full object-cover" />
            </div>
            {/* teal card */}
            <div className="absolute right-[2%] top-[14%] flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-lg" style={{ background: `linear-gradient(135deg, #0DD5C4, #00B3D2)` }} dir="auto">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/60">
                <Sprout className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold">{t('Terre agricole')}</span>
                <span className="block text-xs text-white/85">{t('Terrains et biens à investir')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
