'use client';

import { useEffect, useState } from 'react';
import { Check, X, Banknote, MessageCircle } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import api from '@/lib/api';
import { formatDZD } from '@/lib/data';

import { useT } from '@/lib/i18n/useT';
import { dateLocale } from '@/lib/i18n/format';
import Link from '@/components/LocaleLink';
// Must match REQUEST_HOLD_MS in backend/src/utils/checkAvailability.js
const REQUEST_HOLD_MS = 48 * 60 * 60 * 1000;

const STATUS = {
  pending: { label: 'Demande à traiter', cls: 'bg-amber-50 text-amber-700' },
  expired: { label: 'Demande expirée', cls: 'bg-gray-100 text-gray-500' },
  confirmed: { label: 'Confirmée', cls: 'bg-green-50 text-green-700' },
  completed: { label: 'Terminée', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annulée', cls: 'bg-red-50 text-red-600' },
  rejected: { label: 'Refusée', cls: 'bg-red-50 text-red-600' },
};

function displayStatus(b) {
  const now = Date.now();
  if (b.status === 'cancelled') return b.rejectionReason ? 'rejected' : 'cancelled';
  if (b.status === 'confirmed' && new Date(b.checkOut) < now) return 'completed';
  if (b.status === 'pending' && (new Date(b.checkIn) < new Date().setHours(0, 0, 0, 0) || now - new Date(b.createdAt) > REQUEST_HOLD_MS)) {
    return 'expired';
  }
  return b.status;
}

const FILTERS = [
  { key: 'pending', label: 'À traiter' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'all', label: 'Toutes' },
];

export default function OwnerBookingsPage() {
  const { t } = useT();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { id, reason }

  const load = async () => {
    try {
      const { data } = await api.get('/bookings/owner');
      setBookings(data.bookings);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (id, action, body) => {
    setBusyId(id);
    try {
      await api.put(`/bookings/${id}/${action}`, body);
      setRejecting(null);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const rows = bookings.map((b) => ({ ...b, shown: displayStatus(b) }));
  const pendingCount = rows.filter((b) => b.shown === 'pending').length;
  const visible = rows.filter((b) =>
    filter === 'all' ? true : filter === 'pending' ? b.shown === 'pending' : ['confirmed', 'completed'].includes(b.shown)
  );

  return (
    <DashboardShell role="owner" title={t('Réservations')}>
      <p className="mb-4 text-sm text-gray-500">
        {t('Les clients envoient une demande : acceptez-la ou refusez-la sous 48 h. Le paiement se fait sur place ; marquez la réservation comme payée une fois le montant encaissé.')}
      </p>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('Filtrer les réservations')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${
              filter === f.key ? 'bg-brand-500 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {t(f.label)}
            {f.key === 'pending' && pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-white">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">{t('Chargement...')}</p>
      ) : error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-600">{error}</p>
      ) : visible.length === 0 ? (
        <p className="text-gray-500">{filter === 'pending' ? t('Aucune demande en attente.') : t('Aucune réservation.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-500">
              <tr>
                <th className="p-4">{t('Client')}</th>
                <th className="p-4">{t('Hébergement')}</th>
                <th className="p-4">{t('Dates')}</th>
                <th className="p-4">{t('Total')}</th>
                <th className="p-4">{t('Statut')}</th>
                <th className="p-4">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => {
                const property = b.propertyType === 'house' ? b.house : b.hotel;
                const busy = busyId === b._id;
                return (
                  <tr key={b._id} className="border-b border-gray-50 align-top transition last:border-0 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{b.customer?.fullName}</div>
                      {/* no guest phone or email: Meskan is the intermediary, write to Meskan about this booking */}
                      <Link
                        href={`/messages?about=${encodeURIComponent(`${t('Réservation')} — ${property?.name || ''} · ${b.customer?.fullName || ''} · ${new Date(b.checkIn).toLocaleDateString(dateLocale())}`)}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" aria-hidden="true" /> {t('Contacter Meskan')}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-600">
                      {property?.name}
                      <div className="text-xs text-gray-400">{b.propertyType === 'house' ? t('Maison entière') : b.room?.title} · {b.guests} {t('pers.')}</div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(b.checkIn).toLocaleDateString(dateLocale())} → {new Date(b.checkOut).toLocaleDateString(dateLocale())}
                      <div className="text-xs text-gray-400">{b.nights} {t(b.nights > 1 ? 'nuits' : 'nuit')}</div>
                    </td>
                    <td className="p-4 font-semibold text-brand-600">{formatDZD(b.totalPrice, b.currency)}</td>
                    <td className="p-4">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS[b.shown].cls}`}>{t(STATUS[b.shown].label)}</span>
                      {b.paymentStatus === 'paid' && <div className="mt-1 text-xs font-medium text-emerald-600">{t('Payé')}</div>}
                      {b.instant && <div className="mt-1 text-xs font-medium text-amber-600">{t('Réservation instantanée')}</div>}
                      {b.lateCancellation && <div className="mt-1 text-xs font-medium text-amber-700">{t('Annulation tardive (après le délai gratuit)')}</div>}
                      {b.shown === 'rejected' && <div className="mt-1 max-w-[180px] text-xs text-gray-400">{b.rejectionReason}</div>}
                    </td>
                    <td className="p-4">
                      {b.shown === 'pending' && rejecting?.id !== b._id && (
                        <div className="flex flex-wrap gap-2">
                          <button disabled={busy} onClick={() => act(b._id, 'confirm')}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                            <Check className="h-4 w-4" aria-hidden="true" /> {t('Accepter')}
                          </button>
                          <button disabled={busy} onClick={() => setRejecting({ id: b._id, reason: '' })}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                            <X className="h-4 w-4" aria-hidden="true" /> {t('Refuser')}
                          </button>
                        </div>
                      )}
                      {rejecting?.id === b._id && (
                        <form onSubmit={(e) => { e.preventDefault(); act(b._id, 'reject', { reason: rejecting.reason }); }} className="space-y-2">
                          <label htmlFor={`reason-${b._id}`} className="block text-xs font-medium text-gray-600">{t('Motif du refus (envoyé au client)')}</label>
                          <input id={`reason-${b._id}`} autoFocus required value={rejecting.reason}
                            onChange={(e) => setRejecting({ ...rejecting, reason: e.target.value })}
                            placeholder={t('Ex : complet à ces dates')}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-red-400" />
                          <div className="flex gap-2">
                            <button disabled={busy} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">{t('Confirmer le refus')}</button>
                            <button type="button" onClick={() => setRejecting(null)} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">{t('Annuler')}</button>
                          </div>
                        </form>
                      )}
                      {['confirmed', 'completed'].includes(b.shown) && b.paymentStatus === 'unpaid' && (
                        <button disabled={busy} onClick={() => { if (confirm(`Confirmer l'encaissement de ${formatDZD(b.totalPrice, b.currency)} ?`)) act(b._id, 'paid'); }}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                          <Banknote className="h-4 w-4" aria-hidden="true" /> {t('Marquer payé')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
