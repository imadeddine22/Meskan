import localFont from 'next/font/local';
import './globals.css';
import AuthInit from '@/components/AuthInit';
import WelcomeNotice from '@/components/WelcomeNotice';

// Fredoka (variable, 300–700) shipped with the app from @fontsource-variable/fredoka, so neither
// the build nor visitors depend on Google Fonts. The latin file covers French accents (é, ï, â…).
const fredoka = localFont({
  src: '../../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2',
  weight: '300 700',
  display: 'swap',
  variable: '--font-fredoka',
  // No built-in fallback here: next/font's adjusted-Arial fallback has Arabic glyphs and would
  // win over Cairo. The full stack (Fredoka → Cairo → system fonts) lives in tailwind.config.js.
  fallback: [],
  adjustFontFallback: false,
});

// Cairo (variable, 200–1000, Arabic subset) for Arabic letters, which Fredoka doesn't have.
// Listed right after Fredoka in the font stack; restricted to Arabic code points and not
// preloaded, so French/English visitors never download it.
const cairo = localFont({
  src: '../../node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2',
  weight: '200 1000',
  display: 'swap',
  variable: '--font-cairo',
  preload: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200E, U+2010-2011, U+204F, U+2E41' }],
});
import { JsonLd, SITE_NAME, SITE_URL } from '@/lib/seo';

import T from '@/components/T';
import { UrlLangProvider } from '@/components/UrlLang';
import { translate } from '@/lib/i18n';
import { getLang, getUrlLang, pageMeta } from '@/lib/i18n/server';
const DESCRIPTION =
  "Hôtels, maisons à louer et biens à vendre dans les 69 wilayas d'Algérie. Annonces vérifiées, réservation gratuite, paiement sur place.";

const HOME_TITLE = 'Meskan — Hôtels, locations et immobilier en Algérie';

// Per language: /ar and /en are their own indexable versions (canonical + hreflang)
export function generateMetadata() {
  const lang = getLang();
  const brand = translate(lang, SITE_NAME);
  const home = pageMeta({ path: '/', title: HOME_TITLE, description: DESCRIPTION });
  return {
    metadataBase: new URL(SITE_URL),
    ...home,
    title: { default: home.title.absolute, template: `%s | ${brand}` },
    applicationName: brand,
    openGraph: {
      ...home.openGraph,
      type: 'website',
      siteName: brand,
      images: [{ url: '/hand_holding_house.png', alt: brand }],
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    formatDetection: { telephone: false },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

const siteLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/meskan-mark.png`,
    email: 'meskandz208@gmail.com',
    areaServed: { '@type': 'Country', name: 'Algérie' },
    address: { '@type': 'PostalAddress', addressLocality: 'Alger', addressCountry: 'DZ' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['fr', 'ar', 'en'],
  },
];

export default function RootLayout({ children }) {
  const lang = getLang();
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`${fredoka.variable} ${cairo.variable}`}>
      <body className="font-sans antialiased">
        <UrlLangProvider lang={getUrlLang()}>
        <a href="#main-content" className="skip-link">
          <T>Aller au contenu principal</T>
        </a>
        <JsonLd data={siteLd} />
        <AuthInit />
        <WelcomeNotice />
        <div id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </div>
        </UrlLangProvider>
      </body>
    </html>
  );
}
