'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Trash2, Search, Eye, MapPin, Tag, Plus, X, ChevronDown } from 'lucide-react';
import api, { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { useWilayas, regionsFor } from '@/hooks/useWilayas';
import ImageUploader from '@/components/ImageUploader';

import { useT } from '@/lib/i18n/useT';
import CountrySelect from '@/components/CountrySelect';
import { currencyOf } from '@/lib/countries';
import SalePriceNotice from '@/components/SalePriceNotice';
import { MULTI_COUNTRY } from '@/lib/countries';
const PROPERTY_TYPES = ['Appartement', 'Villa', 'Maison', 'Duplex', 'Studio', 'Terrain', 'Local commercial', 'Ferme', 'Chalet', 'Immeuble'];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Rejetées' },
];

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
};

export default function AdminAllSales() {
  const { t } = useT();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [rejectingSale, setRejectingSale] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [openSelect, setOpenSelect] = useState(null); // 'type' | 'wilaya'
  const { wilayas } = useWilayas();

  const emptyForm = {
    title: '', description: '', country: 'DZ', wilaya: '', city: '', address: '',
    type: 'Appartement', price: '', area: '', rooms: '1', bathrooms: '1',
    amenities: '', contactPhone: '', contactEmail: '',
  };
  const [form, setForm] = useState(emptyForm);

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('images', f));

      await api.post('/seller/listings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setShowForm(false);
      setForm(emptyForm);
      setFiles([]);
      fetchSales();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (q) params.q = q;
      const { data } = await api.get('/admin/sales/all', { params });
      setSales(data.sales || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSales();
  };

  const handleAction = async (id, action, reason = '') => {
    setActionLoading(id);
    try {
      if (action === 'approve') {
        await api.put(`/admin/sales/${id}/approve`);
      } else if (action === 'reject') {
        await api.put(`/admin/sales/${id}/reject`, { reason });
      } else if (action === 'delete') {
        if (!confirm(t('Supprimer cette annonce définitivement ?'))) {
          setActionLoading(null);
          return;
        }
        await api.delete(`/admin/sales/${id}`);
      }
      fetchSales();
      setViewingSale(null);
      setRejectingSale(null);
      setRejectionReason('');
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('Ventes Immobilières')}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} {t(total !== 1 ? 'annonces' : 'annonce')} {t('au total')}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-bold text-white shadow-md hover:bg-brand-600 transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5" /> {t('Nouvelle annonce')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">{error}</div>
      )}

      {/* Creation Form */}
      {showForm && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{t('Nouvelle annonce (Administrateur)')}</h2>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); setFiles([]); }} className="rounded-full p-2 hover:bg-gray-100 transition">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Titre *')}</label>
                <input
                  required value={form.title} onChange={(e) => set('title', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder={t('Ex: Villa 4 pièces vue mer')}
                />
              </div>
              <div className="relative">
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Type *')}</label>
                <div 
                  onClick={() => setOpenSelect(openSelect === 'type' ? null : 'type')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none bg-white cursor-pointer flex items-center justify-between transition focus-within:border-brand-500 shadow-sm"
                >
                  <span className="font-serif font-bold text-slate-800">{form.type || t('Sélectionner...')}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${openSelect === 'type' ? 'rotate-180' : ''}`} />
                </div>
                {openSelect === 'type' && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-30 max-h-64 overflow-y-auto rounded-xl bg-white py-1.5 shadow-xl border border-gray-100">
                    {PROPERTY_TYPES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          set('type', item);
                          setOpenSelect(null);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-sm font-serif font-bold transition-all border-l-2 ${
                          form.type === item
                            ? 'text-teal-600 border-teal-500 bg-teal-50/30'
                            : 'text-slate-800 border-transparent hover:bg-slate-50/50 hover:text-teal-600'
                        }`}
                      >
                        {t(item)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Description')}</label>
              <textarea
                rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition resize-none"
                placeholder={t('Décrivez le bien...')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {MULTI_COUNTRY && (
<div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Pays *')}</label>
                <CountrySelect value={form.country} onChange={(c) => setForm((f) => ({ ...f, country: c, wilaya: '' }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-serif font-bold text-slate-800 outline-none shadow-sm" />
              </div>
)}
              <div className="relative">
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Wilaya *')}</label>
                <div 
                  onClick={() => setOpenSelect(openSelect === 'wilaya' ? null : 'wilaya')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none bg-white cursor-pointer flex items-center justify-between transition focus-within:border-brand-500 shadow-sm"
                >
                  <span className="font-serif font-bold text-slate-800">{form.wilaya ? t(form.wilaya) : t('Sélectionner...')}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${openSelect === 'wilaya' ? 'rotate-180' : ''}`} />
                </div>
                {openSelect === 'wilaya' && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-30 max-h-64 overflow-y-auto rounded-xl bg-white py-1.5 shadow-xl border border-gray-100">
                    {regionsFor(form.country, wilayas)?.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          set('wilaya', w);
                          setOpenSelect(null);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-sm font-serif font-bold transition-all border-l-2 ${
                          form.wilaya === w
                            ? 'text-teal-600 border-teal-500 bg-teal-50/30'
                            : 'text-slate-800 border-transparent hover:bg-slate-50/50 hover:text-teal-600'
                        }`}
                      >
                        {t(w)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Ville *')}</label>
                <input
                  required value={form.city} onChange={(e) => set('city', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder={t('Ex: Hydra')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Adresse')}</label>
                <input
                  value={form.address} onChange={(e) => set('address', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder={t('Ex: Rue...')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Prix')} ({currencyOf(form.country)}) *</label>
                <input
                  type="number" required min="0" value={form.price} onChange={(e) => set('price', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder="15000000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Surface (m²)')}</label>
                <input
                  type="number" min="0" value={form.area} onChange={(e) => set('area', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Pièces')}</label>
                <input
                  type="number" min="0" value={form.rooms} onChange={(e) => set('rooms', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Salles de bain')}</label>
                <input
                  type="number" min="0" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                />
              </div>
              {/* Meskan adds 1 % to the seller's price: say it here, with the price buyers will see */}
              <SalePriceNotice price={form.price} currency={currencyOf(form.country)} className="md:col-span-4" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Téléphone de contact')}</label>
                <input
                  value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder="0555 123 456"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Email de contact')}</label>
                <input
                  type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                  placeholder={t('admin@email.com')}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">{t('Équipements (séparés par des virgules)')}</label>
              <input
                value={form.amenities} onChange={(e) => set('amenities', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500 transition"
                placeholder={t('Garage, Jardin, Piscine, Ascenseur...')}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('Photos')}</label>
              <ImageUploader files={files} setFiles={setFiles} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={saving}
                className="rounded-full bg-brand-500 px-8 py-3 font-bold text-white shadow-md hover:bg-brand-600 transition disabled:opacity-60"
              >
                {saving ? t('Enregistrement...') : t('Publier l\'annonce')}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setFiles([]); }}
                className="rounded-full border border-gray-200 px-6 py-3 font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                {t('Annuler')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('Rechercher par titre...')}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button type="submit" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition">
            {t('Chercher')}
          </button>
        </form>

        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                status === opt.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
              }`}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white animate-pulse border border-gray-100"></div>
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gray-50">
            <Tag className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t('Aucune annonce')}</h3>
          <p className="text-sm text-gray-500">{t('Aucune annonce de vente ne correspond à vos critères')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale._id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
              {/* Thumbnail */}
              <div className="h-16 w-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                {sale.images?.[0] ? (
                  <img src={getImageUrl(sale.images[0].url)} alt={t(sale.title)} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <Tag className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingSale(sale)}>
                <h3 className="font-bold text-gray-900 truncate hover:text-emerald-600 transition">{t(sale.title)}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {t(sale.city)}, {t(sale.wilaya)}
                  </span>
                  <span>{t(sale.type)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {sale.views || 0}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="text-right shrink-0 cursor-pointer" onClick={() => setViewingSale(sale)}>
                <p className="font-extrabold text-emerald-600">{formatDZD(sale.price, sale.currency)}</p>
                {sale.sellerPrice != null && sale.sellerPrice !== sale.price && <p className="text-[11px] text-gray-400">{t('Prix du vendeur :')} {formatDZD(sale.sellerPrice, sale.currency)}</p>}
                <p className="text-xs text-gray-400">{sale.seller?.fullName || t('Vendeur')}</p>
              </div>

              {/* Status */}
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGE[sale.status]}`}>
                {t(STATUS_LABEL[sale.status])}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setViewingSale(sale)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 transition"
                  title={t('Voir l\'offre complète')}
                >
                  <Eye className="h-5 w-5" />
                </button>
                {sale.status !== 'approved' && (
                  <button
                    onClick={() => handleAction(sale._id, 'approve')}
                    disabled={actionLoading === sale._id}
                    className="grid h-9 w-9 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                    title={t('Approuver')}
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                )}
                {sale.status !== 'rejected' && (
                  <button
                    onClick={() => { setRejectingSale(sale); setRejectionReason(''); }}
                    disabled={actionLoading === sale._id}
                    className="grid h-9 w-9 place-items-center rounded-lg text-amber-600 hover:bg-amber-50 transition disabled:opacity-40"
                    title={t('Rejeter avec motif')}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => handleAction(sale._id, 'delete')}
                  disabled={actionLoading === sale._id}
                  className="grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                  title={t('Supprimer')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-9 w-9 rounded-full text-sm font-bold transition ${
                page === p
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── FULL OFFER DETAILS MODAL ── */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  {t(viewingSale.type)} {t('· Ref:')} {viewingSale.reference || viewingSale._id}
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900">{t(viewingSale.title)}</h2>
              </div>
              <button onClick={() => setViewingSale(null)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Gallery */}
            {viewingSale.images?.length > 0 ? (
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3 mb-6 rounded-2xl overflow-hidden">
                {viewingSale.images.map((img, i) => (
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

            {/* Key Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-gray-50 mb-6 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">{t('Prix')}</p>
                <p className="text-lg font-extrabold text-emerald-600">{formatDZD(viewingSale.price, viewingSale.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">{t('Surface')}</p>
                <p className="font-bold text-gray-800">{viewingSale.area ? t('{area} m²', { area: viewingSale.area }) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">{t('Pièces / SDB')}</p>
                <p className="font-bold text-gray-800">{viewingSale.rooms || 0} {t('pcs ·')} {viewingSale.bathrooms || 0} {t('sdb')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">{t('Statut')}</p>
                <span className={`inline-block mt-1 rounded-full border px-3 py-0.5 text-xs font-bold ${STATUS_BADGE[viewingSale.status]}`}>
                  {t(STATUS_LABEL[viewingSale.status])}
                </span>
              </div>
            </div>

            {/* Rejection notice if rejected */}
            {viewingSale.status === 'rejected' && viewingSale.rejectionReason && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-200">
                <p className="text-xs font-bold text-red-800 uppercase">{t('Motif du refus enregistré :')}</p>
                <p className="mt-1 text-sm font-semibold text-red-700 italic">"{viewingSale.rejectionReason}"</p>
              </div>
            )}

            {/* Location & Contact Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl border border-gray-100 p-4">
                <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-500" /> {t('Emplacement')}
                </h4>
                <p className="text-sm text-gray-600 font-medium">{viewingSale.address || viewingSale.city}, {t(viewingSale.wilaya)}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-emerald-500" /> {t('Contact Vendeur')}
                </h4>
                <p className="text-sm font-semibold text-gray-800">{viewingSale.seller?.fullName || t('Vendeur')}</p>
                <p className="text-xs text-gray-500">{viewingSale.contactPhone || viewingSale.seller?.email || t('Pas de numéro')}</p>
              </div>
            </div>

            {/* Description */}
            {viewingSale.description && (
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-1 text-sm">{t('Description')}</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  {viewingSale.description}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {viewingSale.status !== 'approved' && (
                <button
                  onClick={() => handleAction(viewingSale._id, 'approve')}
                  className="rounded-full bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  {t('Approuver l\'offre')}
                </button>
              )}
              {viewingSale.status !== 'rejected' && (
                <button
                  onClick={() => {
                    setRejectingSale(viewingSale);
                    setRejectionReason('');
                  }}
                  className="rounded-full bg-amber-500 px-6 py-2.5 font-bold text-white shadow-md hover:bg-amber-600 transition"
                >
                  {t('Rejeter avec motif')}
                </button>
              )}
              <button
                onClick={() => setViewingSale(null)}
                className="rounded-full border border-gray-200 px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                {t('Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION REASON MODAL ── */}
      {rejectingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('Refuser l\'offre :')} {t(rejectingSale.title)}</h3>
              <button onClick={() => setRejectingSale(null)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Veuillez indiquer la raison du refus. Ce message sera transmis directement au vendeur dans son جدول التحكم.
            </p>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                'Informations incomplètes',
                'Photos non claires',
                'Prix non conforme au marché',
                'Adresse inexacte',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRejectionReason(chip)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('Écrivez le motif du refus ici...')}
              className="w-full rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-amber-500 transition resize-none mb-6"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingSale(null)}
                className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                {t('Annuler')}
              </button>
              <button
                onClick={() => handleAction(rejectingSale._id, 'reject', rejectionReason)}
                disabled={actionLoading === rejectingSale._id}
                className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading === rejectingSale._id ? t('Envoi...') : t('Confirmer le refus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
