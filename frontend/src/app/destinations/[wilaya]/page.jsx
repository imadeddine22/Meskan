import Link from '@/components/LocaleLink';
import { permanentRedirect } from 'next/navigation';
import WilayaClient from './WilayaClient';
import { apiGet, breadcrumbLd, faqLd, formatDZD, JsonLd, SITE_URL } from '@/lib/seo';
import { getWilayaInfo, getNeighbourWilayas, wilayaPath } from '@/lib/wilayaInfo';

import T from '@/components/T';
import { translate } from '@/lib/i18n';
import { getT, pageMeta } from '@/lib/i18n/server';
import { localePath } from '@/lib/i18n/locale';
const median = (nums) => {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

// Live, per-wilaya numbers: these are what make each destination page unique.
async function getWilayaStats(name) {
  const q = encodeURIComponent(name);
  const [hotels, houses, sales] = await Promise.all([
    apiGet(`/hotels?wilaya=${q}&limit=50`),
    apiGet(`/houses?wilaya=${q}&limit=50`),
    apiGet(`/sales?wilaya=${q}&limit=50`),
  ]);
  const hotelList = hotels?.hotels || [];
  const rated = hotelList.filter((h) => h.reviewsCount > 0);
  return {
    reachable: Boolean(hotels || houses || sales),
    hotels: hotels?.total ?? hotelList.length,
    houses: houses?.total ?? houses?.houses?.length ?? 0,
    sales: sales?.total ?? sales?.listings?.length ?? 0,
    medianNight: median((houses?.houses || []).map((h) => h.pricePerNight)),
    medianSale: median((sales?.listings || []).map((l) => l.price)),
    topHotel: rated.sort((a, b) => b.avgRating - a.avgRating)[0] || null,
    cities: [...new Set([...hotelList, ...(houses?.houses || [])].map((x) => x.city).filter(Boolean))].slice(0, 8),
  };
}

// Each FAQ entry is a translation key + values, so it can be shown in the visitor's language
// (<T k vars />); the French text built from the same key feeds the JSON-LD for search engines.
function buildFaqs(name, info, s) {
  const msg = (k, vars) => ({ k, vars });
  const faqs = [
    {
      q: msg("Combien d'hôtels sont disponibles à {name} sur Meskan ?", { name }),
      a: s.hotels
        ? msg("Meskan référence actuellement {n} hôtel(s) vérifié(s) dans la wilaya de {name}, réservables en ligne gratuitement, avec paiement sur place à l'arrivée.", { n: s.hotels, name })
        : msg("Aucun hôtel n'est encore publié à {name}. Les hôteliers de la wilaya peuvent inscrire leur établissement gratuitement sur Meskan.", { name }),
    },
    {
      q: msg("Quel est le prix d'une location de maison à {name} ?", { name }),
      a: s.medianNight
        ? msg("Le prix médian d'une maison ou d'un appartement en location à {name} est de {price} par nuit, calculé sur les {n} annonces publiées sur Meskan.", { name, price: formatDZD(s.medianNight), n: s.houses })
        : msg("Il n'y a pas encore assez d'annonces de location à {name} pour calculer un prix moyen. Consultez la page régulièrement : de nouvelles maisons sont ajoutées chaque semaine.", { name }),
    },
    {
      q: msg('Peut-on acheter un bien immobilier à {name} via Meskan ?', { name }),
      a: s.sales
        ? s.medianSale
          ? msg('Oui, {n} bien(s) à vendre publié(s) à {name}, pour un prix médian de {price}. Chaque annonce est validée par notre équipe et Meskan vous met en relation avec le vendeur.', { n: s.sales, name, price: formatDZD(s.medianSale) })
          : msg('Oui, {n} bien(s) à vendre publié(s) à {name}. Chaque annonce est validée par notre équipe et Meskan vous met en relation avec le vendeur.', { n: s.sales, name })
        : msg("Aucun bien n'est actuellement en vente à {name}. Les vendeurs peuvent publier une annonce après inscription sur Meskan.", { name }),
    },
  ];
  if (info) {
    faqs.push({
      q: msg('Quand partir à {name} ?', { name }),
      a: msg('{name} (wilaya n°{code}) fait partie de la région {region}. {blurb}', { name, code: info.code, region: info.region.label, blurb: info.region.blurb }),
    });
  }
  return faqs;
}

const fr = (m) => translate('fr', m.k, m.vars);

export async function generateMetadata({ params }) {
  const name = decodeURIComponent(params.wilaya);
  const info = getWilayaInfo(name);
  const displayName = info?.name || name;
  const s = await getWilayaStats(displayName);
  const total = s.hotels + s.houses + s.sales;

  const { t } = getT();
  const place = t(displayName);
  const parts = [];
  if (s.hotels) parts.push(t(s.hotels > 1 ? '{n} hôtels' : '{n} hôtel', { n: s.hotels }));
  if (s.houses) parts.push(t(s.houses > 1 ? '{n} maisons à louer' : '{n} maison à louer', { n: s.houses }));
  if (s.sales) parts.push(t(s.sales > 1 ? '{n} biens à vendre' : '{n} bien à vendre', { n: s.sales }));

  return pageMeta({
    path: wilayaPath(displayName),
    title: t('Hôtels, locations et maisons à vendre à {name}', { name: place }),
    description: parts.length
      ? t('{parts} à {name}. Comparez les prix, lisez les avis et réservez gratuitement en ligne, paiement sur place, sur Meskan.', { parts: parts.join(', '), name: place })
      : t('Trouvez un hôtel, une maison à louer ou un bien à acheter à {name}. Réservation en ligne gratuite et paiement sur place sur Meskan.', { name: place }),
    // Unknown wilaya, or no listings and no editorial content: keep it out of the index.
    robots: !info || (s.reachable && total === 0 && !info.highlights.length) ? { index: false, follow: true } : undefined,
  });
}

export default async function WilayaPage({ params }) {
  const name = decodeURIComponent(params.wilaya);
  const info = getWilayaInfo(name);
  const displayName = info?.name || name;
  const s = await getWilayaStats(displayName);
  // One URL per wilaya: /destinations/Béjaïa, /destinations/BEJAIA… → 301 /destinations/bejaia
  if (info && `/destinations/${params.wilaya}` !== wilayaPath(info.name)) permanentRedirect(localePath(getT().lang, wilayaPath(info.name)));
  const faqs = buildFaqs(displayName, info, s);
  const neighbours = getNeighbourWilayas(displayName);

  return (
    <WilayaClient wilayaName={displayName}>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Destinations', path: '/destinations' },
            { name: displayName, path: wilayaPath(displayName) },
          ]),
          faqLd(faqs.map((f) => ({ q: fr(f.q), a: fr(f.a) }))),
        ]}
      />

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-4 text-slate-700" aria-labelledby="wilaya-guide">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900"><T>Accueil</T></Link>
          <span aria-hidden="true"> / </span>
          <Link href="/destinations" className="hover:text-slate-900"><T>Destinations</T></Link>
          <span aria-hidden="true"> / </span>
          <span className="text-slate-900"><T>{displayName}</T></span>
        </nav>

        <h2 id="wilaya-guide" className="font-serif text-2xl font-bold text-slate-900 md:text-3xl">
          <T k="Séjourner, louer ou acheter à {name}" vars={{ name: displayName }} />
        </h2>

        <p className="mt-3 max-w-3xl leading-relaxed">
          {info && <T k="{displayName} est la wilaya n°{code} d'Algérie, dans la région {label}. " vars={{ displayName, code: info.code, label: info.region.label }} />}
          {s.hotels + s.houses + s.sales > 0 ? (
            <T k="Sur Meskan, vous y trouvez {hotels} hôtel(s), {houses} maison(s) à louer et {sales} bien(s) à vendre, tous vérifiés par notre équipe." vars={{ hotels: s.hotels, houses: s.houses, sales: s.sales }} />
          ) : (
            <T k="Les premières annonces de {displayName} arrivent bientôt sur Meskan. Hôteliers, propriétaires et vendeurs de la wilaya peuvent publier leur annonce dès maintenant." vars={{ displayName }} />
          )}
          {s.cities.length > 0 && <> <T k="Annonces disponibles notamment à {cities}." vars={{ cities: s.cities.join(', ') }} /></>}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Hôtels', value: s.hotels },
            { label: 'Locations', value: s.houses },
            { label: 'Prix médian / nuit', value: s.medianNight ? formatDZD(s.medianNight) : '—' },
            { label: 'Prix médian à la vente', value: s.medianSale ? formatDZD(s.medianSale) : '—' },
          ].map((st) => (
            <div key={st.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500"><T>{st.label}</T></dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{st.value}</dd>
            </div>
          ))}
        </dl>

        {s.topHotel && (
          <p className="mt-6">
            <T>L'hôtel le mieux noté de la wilaya est</T>{' '}
            <Link href={`/hotels/${s.topHotel._id}`} className="font-semibold text-cyan-700 underline-offset-2 hover:underline">
              {s.topHotel.name}
            </Link>{' '}
            <T k="({rating}/10 sur {n} avis)." vars={{ rating: Number(s.topHotel.avgRating).toFixed(1), n: s.topHotel.reviewsCount }} />
          </p>
        )}

        {info?.highlights.length > 0 && (
          <>
            <h3 className="mt-8 text-lg font-bold text-slate-900"><T k="À voir à {name}" vars={{ name: displayName }} /></h3>
            <ul className="mt-2 list-disc space-y-1 ps-5">
              {info.highlights.map((h) => <li key={h}><T>{h.charAt(0).toUpperCase() + h.slice(1)}</T></li>)}
            </ul>
          </>
        )}

        <h3 className="mt-8 text-lg font-bold text-slate-900"><T>Questions fréquentes</T></h3>
        <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {faqs.map((f) => (
            <details key={f.q.k} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">
                <T k={f.q.k} vars={f.q.vars} />
              </summary>
              <p className="mt-2 leading-relaxed"><T k={f.a.k} vars={f.a.vars} /></p>
            </details>
          ))}
        </div>

        {neighbours.length > 0 && (
          <>
            <h3 className="mt-8 text-lg font-bold text-slate-900"><T>Autres destinations —</T> <T>{info.region.label}</T></h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {neighbours.map((w) => (
                <li key={w}>
                  <Link
                    href={wilayaPath(w)}
                    className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium hover:border-cyan-500 hover:text-cyan-700"
                  >
                    <T>{w}</T>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-8 text-sm">
          <T k="Vous financez un achat à {name} ?" vars={{ name: displayName }} />{' '}
          <Link href="/outils/simulateur-credit-immobilier" className="font-semibold text-cyan-700 hover:underline">
            <T>Simulez votre crédit immobilier</T>
          </Link>{' '}
          <T>ou</T>{' '}
          <Link href="/outils/rentabilite-locative" className="font-semibold text-cyan-700 hover:underline">
            <T>calculez la rentabilité d'une location</T>
          </Link>.
        </p>
      </section>
    </WilayaClient>
  );
}
