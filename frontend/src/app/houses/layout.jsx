import { apiGet } from '@/lib/seo';
import { InitialData } from '@/components/InitialData';
import { getLang, pageMeta } from '@/lib/i18n/server';
import { localized } from '@/lib/i18n/localizeData';

export function generateMetadata() {
  return pageMeta({
    path: '/houses',
    title: 'Maisons et appartements à louer en Algérie',
    description: "Villas, appartements, chalets et studios à louer à la nuit, au mois ou à l'année dans toute l'Algérie. Annonces vérifiées, paiement en DZD.",
  });
}

// First page of listings rendered on the server: crawlers see real listings and links to them
export default async function Layout({ children }) {
  const data = await apiGet('/houses', { revalidate: 300 });
  return <InitialData value={localized(data, getLang())}>{children}</InitialData>;
}
