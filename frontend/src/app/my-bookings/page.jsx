'use client';

import { useEffect, useState } from 'react';
import { MapPin, CheckCircle2, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api, { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';

import { useT } from '@/lib/i18n/useT';
import { dateLocale } from '@/lib/i18n/format';
import ReviewForm from '@/components/ReviewForm';
import Link from '@/components/LocaleLink';
// Must match REQUEST_HOLD_MS in backend/src/utils/checkAvailability.js
const REQUEST_HOLD_MS = 48 * 60 * 60 * 1000;

const STATUS = {
  pending: { label: 'En attente de confirmation', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmée', cls: 'bg-green-50 text-green-700' },
  completed: { label: 'Terminée', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annulée', cls: 'bg-red-50 text-red-600' },
  rejected: { label: 'Refusée', cls: 'bg-red-50 text-red-600' },
  expired: { label: 'Sans réponse', cls: 'bg-gray-100 text-gray-600' },
};

const PAYMENT = {
  unpaid: { label: 'À payer sur place', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  paid: { label: 'Payé', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  refunded: { label: 'Remboursé', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
};

/** Statuses only change on owner/customer actions, so derive what the booking looks like today. */
function displayStatus(b) {
  const now = Date.now();
  if (b.status === 'cancelled') return b.rejectionReason ? 'rejected' : 'cancelled';
  if (b.status === 'confirmed' && new Date(b.checkOut) < now) return 'completed';
  // Compare to the start of today: a request arriving today is still answerable today
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (b.status === 'pending' && (new Date(b.checkIn) < startOfToday || now - new Date(b.createdAt) > REQUEST_HOLD_MS)) return 'expired';
  return b.status;
}

export default function MyBookingsPage() {
  const { t } = useT();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justRequested, setJustRequested] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [reviewed, setReviewed] = useState(new Set()); // booking ids already reviewed

  const load = async () => {
    setLoading(true);
    try {
      const [{ data }, mine] = await Promise.all([api.get('/bookings/my'), api.get('/reviews/mine').catch(() => ({ data: { reviews: [] } }))]);
      setBookings(data.bookings);
      setReviewed(new Set((mine.data.reviews || []).map((r) => String(r.booking))));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Coming from the booking form (?requested=1): confirm the request was sent
    const q = new URLSearchParams(window.location.search);
    setJustRequested(q.get('requested') === '1');
    setJustConfirmed(q.get('confirmed') === '1'); // instant booking
  }, []);

  const cancel = async (b) => {
    const free = b.freeCancellationUntil && new Date() <= new Date(b.freeCancellationUntil);
    const msg = free || b.status === 'pending'
      ? t('Voulez-vous vraiment annuler cette réservation ?')
      : t("Le délai d'annulation gratuite est dépassé. Annuler quand même ? Prévenez l'établissement par politesse.");
    if (!confirm(msg)) return;
    const id = b._id;
    try {
      await api.put(`/bookings/${id}/cancel`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-extrabold text-ink">{t('Mes réservations')}</h1>

        {justConfirmed && (
          <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              <strong>{t('Réservation confirmée !')}</strong> {t("Réservation instantanée : pas besoin d'attendre le propriétaire. Vous paierez directement sur place à l'arrivée.")}
            </p>
          </div>
        )}

        {justRequested && (
          <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              <strong>{t('Demande envoyée.')}</strong> {t('Le propriétaire va l\'accepter ou la refuser (sous 48 h au plus). Vous paierez directement sur place à l\'arrivée.')}
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">{t('Chargement...')}</p>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-600">{error}</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-400">{t('Vous n\'avez pas encore de réservation.')}</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isHouse = b.propertyType === 'house';
              const property = isHouse ? b.house : b.hotel;
              const shown = displayStatus(b);
              const started = new Date(b.checkIn) <= new Date();
              const showPayment = ['confirmed', 'completed'].includes(shown) || b.paymentStatus !== 'unpaid';
              const rawUrl = property?.images?.[0]?.url;
              const imgUrl = rawUrl ? getImageUrl(rawUrl) : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80';

              return (
                <div key={b._id} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-card sm:flex-row">
                  <img src={imgUrl} alt={property?.name || ''} className="h-32 w-full rounded-xl object-cover sm:w-48" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-ink">{property?.name || t('Hébergement supprimé')}</h3>
                        <p className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-4 w-4" aria-hidden="true" /> {t(property?.city)}, {t(property?.wilaya)}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {isHouse ? `${property?.type || 'Maison'} entière` : b.room?.title} · {b.guests} {t('pers.')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[shown].cls}`}>{t(STATUS[shown].label)}</span>
                        {showPayment && (
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${PAYMENT[b.paymentStatus || 'unpaid'].cls}`}>
                            {t(PAYMENT[b.paymentStatus || 'unpaid'].label)}
                          </span>
                        )}
                      </div>
                    </div>

                    {shown === 'rejected' && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{t('Motif du refus :')} {b.rejectionReason}</p>
                    )}
                    {['pending', 'confirmed'].includes(b.status) && !started && (
                      <p className="mt-2 text-xs text-gray-500">
                        {b.freeCancellationUntil && new Date() <= new Date(b.freeCancellationUntil)
                          ? t("Annulation gratuite jusqu'au {date}", { date: new Date(b.freeCancellationUntil).toLocaleDateString(dateLocale()) })
                          : t("Délai d'annulation gratuite dépassé")}
                      </p>
                    )}
                    {b.status === 'cancelled' && b.lateCancellation && (
                      <p className="mt-2 text-xs text-amber-700">{t('Annulation tardive (après le délai gratuit)')}</p>
                    )}
                    {shown === 'expired' && (
                      <p className="mt-2 text-xs text-gray-500">{t('Le propriétaire n\'a pas répondu à temps : les dates ne sont plus réservées.')}</p>
                    )}

                    <div className="mt-auto flex items-end justify-between pt-3">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
                        {/* own direction for each part, so dates and price don't run together in Arabic */}
                        <bdi dir="ltr">
                          {/* Arabic dates carry right-to-left marks that scramble a left-to-right range */}
                          {[b.checkIn, b.checkOut].map((d) => new Date(d).toLocaleDateString(dateLocale()).replace(/[\u200e\u200f]/g, '')).join(' → ')}
                        </bdi>
                        <bdi className="font-bold text-brand-600">{formatDZD(b.totalPrice, b.currency)}</bdi>
                      </p>
                      {/* a real stay (paid on site, or confirmed and over) can be reviewed once */}
                      {b.status !== 'cancelled' && (b.paymentStatus === 'paid' || (b.status === 'confirmed' && new Date(b.checkOut) < new Date())) && (
                        reviewed.has(String(b._id))
                          ? <span className="text-xs font-semibold text-emerald-600">{t('Avis publié — merci !')}</span>
                          : <ReviewForm booking={b} onDone={(id) => setReviewed((prev) => new Set(prev).add(String(id)))} />
                      )}
                      {b.status !== 'cancelled' && (
                        // questions about the stay go to Meskan, which handles them with the establishment
                        <Link
                          href={`/messages?about=${encodeURIComponent(`${t('Réservation')} — ${(b.hotel || b.house)?.name || ''} · ${new Date(b.checkIn).toLocaleDateString(dateLocale())}`)}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" /> {t('Contacter Meskan')}
                        </Link>
                      )}
                      {['pending', 'confirmed'].includes(b.status) && !started && (
                        <button onClick={() => cancel(b)} className="text-sm font-medium text-red-600 hover:underline">
                          {t('Annuler')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
