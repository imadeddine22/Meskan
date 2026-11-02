'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/LocaleLink';
import BrandLogo from '@/components/BrandLogo';
import { Mail } from 'lucide-react';
import api from '@/lib/api';
import { wilayaPath } from '@/lib/wilayaInfo';
import { useT } from '@/lib/i18n/useT';

// Every link goes to a page that exists and has content (no duplicates of the navbar's
// login, no placeholder contact details).
const COLUMNS = [
  {
    title: 'Explorer',
    links: [
      ['/hotels', 'Hôtels'],
      ['/houses', 'Maisons à louer'],
      ['/sales', 'Biens à vendre'],
      ['/destinations', 'Destinations'],
      ['/investir', 'Projets et investissement'],
    ],
  },
  {
    title: 'Mon compte',
    links: [
      ['/my-bookings', 'Mes réservations'],
      ['/messages', 'Messages'],
      ['/favorites', 'Favoris'],
      ['/profile', 'Mon profil'],
      ['/investor/projects', 'Mes projets'],
    ],
  },
  {
    title: 'Propriétaires',
    links: [
      ['/register?role=owner', 'Publier une annonce'],
      ['/pricing', 'Tarifs'],
    ],
  },
  {
    title: 'Meskan',
    links: [
      ['/about', 'À propos'],
      ['/contact', 'Aide et contact'],
      ['/outils', 'Outils gratuits'],
      ['/comparatif', 'Meskan vs Booking, Airbnb, Ouedkniss'],
      ['/credits-photos', 'Crédits photos'],
    ],
  },
];

const SUPPORT_EMAIL = 'support@hotelsdz.dz';

// Wilayas that really have listings (hotels + houses), most listings first; fetched once per page load.
// The API counts them server-side: a few hundred bytes instead of 100 full listings.
let destinationsPromise = null;
const loadDestinations = () =>
  (destinationsPromise ||= api
    .get('/wilayas/popular', { params: { limit: 12 } })
    .then(({ data }) => (data.wilayas || []).map((w) => [w.wilaya, w.count]))
    .catch(() => []));

export default function Footer() {
  const { t } = useT();
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    let active = true;
    loadDestinations().then((list) => active && setDestinations(list));
    return () => {
      active = false;
    };
  }, []);

  // Arabic falls back to a system font that looks smaller than Fredoka: one size up, no letter spacing
  const heading = 'text-xs md:text-sm rtl:text-base rtl:md:text-lg font-black tracking-widest rtl:tracking-normal text-white uppercase mb-5';
  const link = 'hover:text-white transition';

  return (
    <footer className="relative bg-slate-950 text-slate-400 overflow-hidden pt-24 md:pt-36 rounded-t-[50%_40px] md:rounded-t-[50%_100px] border-t border-slate-900">
      {/* ─── Soft Radial Glow inside the Dome ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100%] md:w-[60%] aspect-square bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.1),transparent_50%)] pointer-events-none rounded-full"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center pb-16">
        <h3 className="text-3xl md:text-5xl font-black font-serif text-white tracking-tight leading-tight">
          {t('Laissez Meskan gérer vos séjours.')} <br />
          {t("Simplifiez vos réservations dès aujourd'hui.")}
        </h3>
        <p className="text-slate-400 text-sm md:text-base rtl:text-base rtl:md:text-lg font-medium mt-4 max-w-md mx-auto leading-relaxed">
          {t('Inscrivez votre établissement en quelques minutes. Sans frais de service, sans commission, et touchez des milliers de clients.')}
        </p>
        <div className="mt-8">
          <Link
            href="/register?role=owner"
            className="inline-block bg-white hover:bg-slate-50 text-slate-900 font-bold px-8 py-3.5 rounded-full text-sm rtl:text-base transition shadow-md hover:scale-102"
          >
            {t('Commencer gratuitement')}
          </Link>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-10 border-t border-slate-900">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 items-start">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={t(col.title)}>
              <h4 className={heading}>{t(col.title)}</h4>
              <ul className="space-y-3.5 text-sm md:text-base rtl:text-base rtl:md:text-lg font-semibold">
                {col.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className={link}>{t(label)}</Link></li>
                ))}
              </ul>
              {col.title === 'Meskan' && (
                <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-5 flex items-center gap-2 text-sm md:text-base rtl:md:text-lg text-slate-400 hover:text-white transition">
                  <Mail className="h-4 w-4 text-teal-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">{SUPPORT_EMAIL}</span>
                </a>
              )}
            </nav>
          ))}
        </div>

        {/* Destinations with listings only (no links to empty wilaya pages) */}
        {destinations.length > 0 && (
          <nav aria-label={t('Destinations populaires')} className="mt-12 border-t border-slate-900/60 pt-8">
            <p className={heading}>{t('Destinations populaires')}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm md:text-base rtl:text-base rtl:md:text-lg font-semibold">
              {destinations.map(([w, n]) => (
                <li key={w}>
                  <Link href={wilayaPath(w)} className={link}>
                    {t(w)} <span className="font-normal text-slate-500">({n})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ─── Massive Branding Watermark Logo at the Bottom ─── */}
        <div aria-hidden="true" className="mt-16 flex justify-center select-none opacity-[0.06] transition duration-700 hover:opacity-[0.1]">
          <BrandLogo variant="light" alt="" className="h-20 md:h-40" textClassName="text-6xl md:text-9xl" />
        </div>

        {/* Mini Bottom Bar */}
        <div className="border-t border-slate-900/60 py-6 text-center text-xs md:text-sm rtl:text-sm rtl:md:text-base font-bold uppercase tracking-widest rtl:tracking-normal text-slate-400">
          © {new Date().getFullYear()} {t('Meskan.')} {t.copyright}
        </div>
      </div>
    </footer>
  );
}
