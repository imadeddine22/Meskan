import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import T from '@/components/T';
import { pageMeta } from '@/lib/i18n/server';
import { WILAYA_LIST } from '@/lib/wilayas';
import { WILAYA_PHOTOS } from '@/lib/wilayaPhotos';

export function generateMetadata() {
  return pageMeta({
    path: '/credits-photos',
    title: 'Crédits photos',
    description: 'Auteurs et licences des photos des wilayas utilisées sur Meskan (Wikimedia Commons).',
  });
}

// The free licences (CC BY, CC BY-SA…) of the wilaya photos require naming the author and the licence.
export default function PhotoCreditsPage() {
  const rows = WILAYA_LIST.map((w) => ({ ...w, ...WILAYA_PHOTOS[w.code] })).filter((w) => w.author);
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold text-ink"><T>Crédits photos</T></h1>
        <p className="mt-3 text-gray-600">
          <T>Les photos des wilayas proviennent de Wikimedia Commons et sont utilisées selon leur licence libre. Merci à leurs auteurs.</T>
        </p>
        <ul className="mt-8 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
          {rows.map((w) => (
            <li key={w.code} className="flex items-center gap-4 p-3">
              <img src={w.src} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 text-sm">
                <p className="font-bold text-gray-900">{String(w.code).padStart(2, '0')} · <T>{w.name}</T></p>
                <p className="truncate text-gray-500" dir="ltr">
                  {w.author} — {w.licence} —{' '}
                  <a href={w.source} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Wikimedia Commons</a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <Footer />
    </main>
  );
}
