'use client';

import { statusLabel } from '@/lib/statusLabels';
import { useEffect, useState } from 'react';
import Link from '@/components/LocaleLink';
import { Plus, MapPin, Trash2, Pencil } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import api, { getImageUrl } from '@/lib/api';

import ChangedBadge from '@/components/ChangedBadge';
import { useT } from '@/lib/i18n/useT';
import PromoteListing from '@/components/PromoteListing';
import ReelManager from '@/components/ReelManager';
const STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
};

const TYPES = ['Luxe', 'Affaires', 'Balnéaire', 'Riad', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'];

export default function MyHotelsPage() {
  const { t } = useT();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { type: typeFilter } : {};
      const { data } = await api.get('/hotels/my/list', { params });
      setHotels(data.hotels);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [typeFilter]);

  const remove = async (id) => {
    if (!confirm(t('Supprimer cet hôtel et toutes ses chambres ?'))) return;
    try { await api.delete(`/hotels/${id}`); load(); } catch (e) { alert(e.message); }
  };

  return (
    <DashboardShell role="owner" title={t('Mes hôtels')}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1" style={{ maxWidth: '100%' }}>
          <button
            onClick={() => setTypeFilter('')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${!typeFilter ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 bg-white'}`}
          >
            {t('Tous les types')}
          </button>
          {TYPES.map((item) => (
            <button
              key={item}
              onClick={() => setTypeFilter(item)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${typeFilter === item ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 bg-white'}`}
            >
              {t(item)}
            </button>
          ))}
        </div>
        <Link href="/owner/hotels/new" className="shrink-0 flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600">
          <Plus className="h-4 w-4" /> {t('Ajouter un hôtel')}
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">{t('Chargement...')}</p>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-600 border border-red-100">{error}</p>
      ) : hotels.length === 0 ? (
        <p className="text-gray-500">{t('Aucun hôtel. Ajoutez votre premier hôtel.')}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((h) => (
            <div key={h._id} className="overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm transition hover:shadow-md">
              <div className="relative h-40">
                {h.images?.[0]?.url && <img src={getImageUrl(h.images[0].url)} alt={h.name} className="h-full w-full object-cover" />}
                <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS[h.status]}`}>
                  {t(statusLabel(h.status))}
                </span>
              </div>
              <div className="p-4">
                <ChangedBadge item={h} owner className="mb-2" />
                <h3 className="font-bold text-gray-900">{h.name}</h3>
                <p className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-4 w-4 text-brand-500" /> {t(h.city)}, {t(h.wilaya)}</p>
                {h.status === 'rejected' && (
                  <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    <span className="font-bold block text-red-800">{t('⚠️ Hôtel rejeté par l\'administration :')}</span>
                    <p className="mt-1 text-red-600 font-medium italic">
                      "{h.rejectionReason || t('Aucun motif spécifié. Veuillez vérifier les informations.')}"
                    </p>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Link href={`/owner/hotels/${h._id}/rooms`} className="flex-1 rounded-lg bg-brand-50 py-2 text-center text-sm font-semibold text-brand-700 hover:bg-brand-100 transition">
                    {t('Chambres')}
                  </Link>
                  <PromoteListing kind="hotel" listing={h} />
                  <ReelManager kind="hotel" listing={h} />
                  <Link href={`/owner/hotels/${h._id}/edit`} className="grid w-10 place-items-center rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button onClick={() => remove(h._id)} className="grid w-10 place-items-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
