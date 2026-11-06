import { noIndex } from '@/lib/seo';

export const metadata = noIndex('Mes informations personnelles');

export default function Layout({ children }) {
  return children;
}
