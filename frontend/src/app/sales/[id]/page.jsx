'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from '@/components/LocaleLink';
import { MapPin, Phone, Mail, ArrowLeft, Eye, Home, Ruler, DoorOpen, Bath, Tag, ChevronLeft, ChevronRight, User, MessageCircle, Calculator } from 'lucide-react';
import MeskanContactCard from '@/components/MeskanContactCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api, { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { monthlyPayment } from '@/components/tools/MortgageCalculator';

import { useT } from '@/lib/i18n/useT';
import { useInitialData } from '@/components/InitialData';
import Avatar from '@/components/Avatar';
import ShareButton from '@/components/ShareButton';
import ListingReel from '@/components/ListingReel';
/** "0552 22 22 22" → "213552222222" for wa.me links */
const waNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  return d.startsWith('213') ? d : d.startsWith('0') ? `213${d.slice(1)}` : `213${d}`;
};

export default function SaleDetailPage() {
  const { t } = useT();
  const { id } = useParams();
  const router = useRouter();
  const initial = useInitialData();
  const [listing, setListing] = useState(initial?.listing ?? null);
  const [loading, setLoading] = useState(!initial?.listing);
  const [imgIdx, setImgIdx] = useState(0);
  const [contact, setContact] = useState(initial?.contact || {}); // Meskan's phone (the intermediary)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/sales/${id}`);
        setListing(data.listing);
        setContact(data.contact || {});
      } catch {
        if (!initial?.listing) router.push('/sales');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center text-gray-400">{t('Chargement...')}</div>
      </>
    );
  }

  if (!listing) return null;

  const images = listing.images || [];


  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg)] pb-16">
        {/* Back */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> {t('Retour')}
          </button>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left: Images & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[16/10]">
                {images.length > 0 ? (
                  <>
                    <img
                      src={getImageUrl(images[imgIdx]?.url)}
                      alt={t(listing.title)}
                      className="h-full w-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setImgIdx((p) => (p - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition shadow"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setImgIdx((p) => (p + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition shadow"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setImgIdx(i)}
                              className={`h-2 rounded-full transition-all ${i === imgIdx ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <Home className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`h-16 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition ${
                        i === imgIdx ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={getImageUrl(img.url)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 mb-3">
                      <Tag className="h-3 w-3" /> {t(listing.type)} {t('· À vendre')}
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t(listing.title)}</h1>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {listing.address && `${listing.address}, `}{t(listing.city)}, {t(listing.wilaya)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <ShareButton
                      title={`${t(listing.title)} — ${formatDZD(listing.price, listing.currency)}`}
                      text={t('Regarde ce bien à vendre sur Meskan : {title} à {city}', { title: t(listing.title), city: t(listing.city) })}
                    />
                    <p className="text-2xl font-extrabold text-emerald-600">{formatDZD(listing.price, listing.currency)}</p>
                    {listing.area > 0 && (
                      <p className="text-xs font-semibold text-gray-500">{formatDZD(Math.round(listing.price / listing.area), listing.currency)} / {t('m²')}</p>
                    )}
                    <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-1">
                      <Eye className="h-3 w-3" /> {listing.views} {t('vues')}
                    </p>
                  </div>
                </div>

                {/* Key specs */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {listing.area > 0 && (
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <Ruler className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900">{listing.area} {t('m²')}</p>
                      <p className="text-[10px] text-gray-400">{t('Surface')}</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <DoorOpen className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{listing.rooms}</p>
                    <p className="text-[10px] text-gray-400">{t('Pièces')}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <Bath className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{listing.bathrooms}</p>
                    <p className="text-[10px] text-gray-400">{t('Salles de bain')}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <Home className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{t(listing.type)}</p>
                    <p className="text-[10px] text-gray-400">{t('Type')}</p>
                  </div>
                </div>

                {/* Description */}
                {listing.description && (
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 mb-2">{t('Description')}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
                  </div>
                )}

                {/* Amenities */}
                {listing.amenities?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">{t('Équipements')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {listing.amenities.map((a, i) => (
                        <span key={i} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Contact Card */}
            <div className="space-y-6">
              <ListingReel kind="sale" listing={listing} />
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">{t('Ce bien vous intéresse ?')}</h3>

                {/* Buyers contact Meskan, the intermediary: the seller's name and phone are never shown */}
                <MeskanContactCard contact={contact} about={`${listing.title}${listing.reference ? ` (${listing.reference})` : ''}`} className="border-0 p-0" />

                <Link
                  href={`/outils/simulateur-credit-immobilier?price=${listing.price}`}
                  className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <span className="flex items-center gap-2"><Calculator className="h-5 w-5" /> {t('Calculer ma mensualité')}</span>
                  <span className="text-xs font-bold">≈ {formatDZD(Math.round(monthlyPayment(listing.price * 0.8, 6, 20) / 100) * 100, listing.currency)} / {t('mois')}</span>
                </Link>

                <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700 font-medium">
                    {t('💡 Conseil : Vérifiez toujours le bien en personne avant tout engagement financier.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
