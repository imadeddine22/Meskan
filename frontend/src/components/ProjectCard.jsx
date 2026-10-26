'use client';

import { MapPin, Maximize2, Handshake, Users, Coins } from 'lucide-react';
import Link from '@/components/LocaleLink';
import { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { formatArea, assetLabel, isCapital, budgetRange, areaRange, placeLabel, PROJECT_COLORS, projectGradient } from '@/lib/projects';
import { useT } from '@/lib/i18n/useT';

/** Card of an investment listing in the /investir list: a property looking for an investor, or an investor's search. */
export default function ProjectCard({ project: p }) {
  const { t, lang } = useT();
  const capital = isCapital(p);
  const cover = getImageUrl(p.images?.[0]?.url || p.images?.[0]);
  return (
    <Link href={`/investir/${p._id}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {capital ? (
          // an investor's search has no photo: a banner with what they look for
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-white" style={{ background: projectGradient }}>
            <Coins className="h-10 w-10" aria-hidden="true" />
            <p className="text-sm font-semibold text-white/85">{t('Investisseur cherche')}</p>
            <p className="text-lg font-black">{assetLabel(p, t)}</p>
          </div>
        ) : (
          cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow" style={{ color: PROJECT_COLORS.ink }}>
          {capital ? t('Recherche de bien') : assetLabel(p, t)} · {t(p.projectType)}
        </span>
        <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> {capital ? areaRange(p, t, lang) : formatArea(p.area, lang)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-bold leading-snug" style={{ color: PROJECT_COLORS.ink }} dir="auto">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0 text-[#00B3D2]" aria-hidden="true" /> {placeLabel(p, t)}
        </p>
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
          <Handshake className="h-4 w-4" aria-hidden="true" /> {t(p.partnership)}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <div>
            <p className="text-[11px] text-slate-400">{capital ? t('Budget') : t('Investissement estimé')}</p>
            <p className="font-extrabold" style={{ color: PROJECT_COLORS.ink }}>{capital ? budgetRange(p, t, formatDZD) : p.budget ? formatDZD(p.budget) : t('À définir')}</p>
          </div>
          {p.interestsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" title={capital ? t('Propositions reçues') : t('Investisseurs intéressés')}>
              <Users className="h-4 w-4" aria-hidden="true" /> {p.interestsCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
