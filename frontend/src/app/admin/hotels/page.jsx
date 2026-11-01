'use client';

import { useEffect, useState } from 'react';
import { Check, X, MapPin, Star, Clock, Eye } from 'lucide-react';
import api, { getImageUrl } from '@/lib/api';

import ChangedBadge from '@/components/ChangedBadge';
import { useT } from '@/lib/i18n/useT';
import AdminHotelDetails from '@/components/AdminHotelDetails';
export default function AdminApprovalsPage() {
  const { t } = useT();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingHotel, setViewingHotel] = useState(null);
  const [rejectingHotel, setRejectingHotel] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/hotels/pending');
      setHotels(data.hotels);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action, reason = '') => {
    setSubmitting(true);
    try {
      await api.put(`/admin/hotels/${id}/${action}`, { reason });
      setHotels((h) => h.filter((x) => x._id !== id));
      setViewingHotel(null);
      setRejectingHotel(null);
      setRejectionReason('');
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('Approbations')}</h1>
        <p className="admin-page-subtitle">
          {t('Hôtels en attente de validation ·')} {hotels.length} {t('en file')}
        </p>
      </div>

      {loading ? (
        <div className="admin-approval-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="admin-approval-card">
              <div className="admin-skeleton" style={{ width: 200, height: 140, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="admin-skeleton" style={{ width: '60%', height: 20 }} />
                <div className="admin-skeleton" style={{ width: '40%', height: 14 }} />
                <div className="admin-skeleton" style={{ width: '80%', height: 14 }} />
                <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                  <div className="admin-skeleton" style={{ width: 100, height: 38 }} />
                  <div className="admin-skeleton" style={{ width: 80, height: 38 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : hotels.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <Check />
            </div>
            <p className="admin-empty-title">{t('Tout est approuvé ! 🎉')}</p>
            <p className="admin-empty-desc">{t('Aucun hôtel en attente de validation')}</p>
          </div>
        </div>
      ) : (
        <div className="admin-approval-grid">
          {hotels.map((h) => (
            <div key={h._id} className="admin-approval-card">
              <img
                src={getImageUrl(h.images?.[0]?.url) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'}
                alt={h.name}
                className="admin-approval-img cursor-pointer"
                onClick={() => setViewingHotel(h)}
              />
              <div className="admin-approval-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 className="admin-approval-name cursor-pointer hover:text-indigo-600" onClick={() => setViewingHotel(h)}>{h.name}</h3>
                  {h.changesToReview && h.status === 'approved' ? <ChangedBadge item={h} /> : (<span className="admin-badge pending">
                    <Clock style={{ width: 12, height: 12, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                    {t('En attente')}
                  </span>)}
                </div>
                <p className="admin-approval-location">
                  <MapPin /> {t(h.city)}, {t(h.wilaya)}
                </p>
                <p className="admin-approval-owner">
                  {t('Propriétaire :')} <strong>{h.owner?.fullName}</strong> ({h.owner?.email})
                </p>
                {h.description && (
                  <p className="admin-approval-desc">{h.description}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {h.starRating && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, color: '#f59e0b' }}>
                      <Star style={{ width: 14, height: 14, fill: '#f59e0b' }} /> {h.starRating} {t('étoiles')}
                    </span>
                  )}
                  {h.type && (
                    <span className="admin-badge customer">{t(h.type)}</span>
                  )}
                </div>
                <div className="admin-approval-actions">
                  <button onClick={() => setViewingHotel(h)} className="admin-btn" style={{ background: '#f1f5f9', color: '#475569' }}>
                    <Eye style={{ width: 16, height: 16 }} /> {t('Voir l\'offre')}
                  </button>
                  <button onClick={() => act(h._id, 'approve')} disabled={submitting} className="admin-btn admin-btn-approve">
                    <Check /> {t('Approuver')}
                  </button>
                  <button onClick={() => { setRejectingHotel(h); setRejectionReason(''); }} disabled={submitting} className="admin-btn admin-btn-reject">
                    <X /> {t('Rejeter')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FULL HOTEL DETAILS MODAL ── */}
      {viewingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  {t(viewingHotel.type)} · {viewingHotel.starRating || 3} {t('Étoiles')}
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900">{viewingHotel.name}</h2>
              </div>
              <button onClick={() => setViewingHotel(null)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Gallery */}
            {viewingHotel.images?.length > 0 ? (
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3 mb-6 rounded-2xl overflow-hidden">
                {viewingHotel.images.map((img, i) => (
                  <img
                    key={i}
                    src={getImageUrl(img.url)}
                    alt=""
                    className="h-40 w-full object-cover rounded-xl border border-gray-100"
                  />
                ))}
              </div>
            ) : (
              <div className="mb-6 flex h-40 w-full items-center justify-center rounded-2xl bg-gray-50 text-gray-400 font-medium">
                {t('Aucune photo disponible')}
              </div>
            )}

            <AdminHotelDetails hotel={viewingHotel} />

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => act(viewingHotel._id, 'approve')}
                className="rounded-full bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 transition"
              >
                {t('Approuver l\'hôtel')}
              </button>
              <button
                onClick={() => {
                  setRejectingHotel(viewingHotel);
                  setRejectionReason('');
                }}
                className="rounded-full bg-amber-500 px-6 py-2.5 font-bold text-white shadow-md hover:bg-amber-600 transition"
              >
                {t('Rejeter avec motif')}
              </button>
              <button
                onClick={() => setViewingHotel(null)}
                className="rounded-full border border-gray-200 px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                {t('Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION REASON MODAL ── */}
      {rejectingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('Refuser l\'hôtel :')} {rejectingHotel.name}</h3>
              <button onClick={() => setRejectingHotel(null)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Veuillez indiquer la raison du refus. Ce message sera transmis مباشرة لصاحب الفندق في لوحة التحكم الخاصة به.
            </p>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                'Informations incomplètes',
                'Photos non conformes',
                'Licence d\'établissement manquante',
                'Coordonnées inexactes',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRejectionReason(chip)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('Écrivez le motif du refus...')}
              className="w-full rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-amber-500 transition resize-none mb-6"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingHotel(null)}
                className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                {t('Annuler')}
              </button>
              <button
                onClick={() => act(rejectingHotel._id, 'reject', rejectionReason)}
                disabled={submitting}
                className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 transition disabled:opacity-50"
              >
                {submitting ? t('Envoi...') : t('Confirmer le refus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
