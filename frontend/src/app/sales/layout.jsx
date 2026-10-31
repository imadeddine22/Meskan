import { apiGet } from '@/lib/seo';
import { InitialData } from '@/components/InitialData';
import { getLang, pageMeta } from '@/lib/i18n/server';
import { localized } from '@/lib/i18n/localizeData';

export function generateMetadata() {
  return pageMeta({
    path: '/sales',
    title: 'Maisons et appartements à vendre en Algérie',
    description: "Annonces immobilières vérifiées : appartements, villas, terrains et locaux à vendre dans les 69 wilayas. Meskan vous met en relation avec le vendeur.",
  });
}

// First page of listings rendered on the server: crawlers see real listings and links to them
export default async function Layout({ children }) {
  const data = await apiGet('/sales?page=1&limit=12&sort=newest', { revalidate: 300 });
  return <InitialData value={localized(data, getLang())}>{children}</InitialData>;
}
