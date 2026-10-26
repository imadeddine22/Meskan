'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Trash2, ExternalLink, Landmark, XCircle } from 'lucide-react';
import Link from '@/components/LocaleLink';
import api, { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { formatArea, assetLabel, documentLabel, isCapital, budgetRange, areaRange, placeLabel } from '@/lib/projects';
import { useT } from '@/lib/i18n/useT';
import { dateLocale } from '@/lib/i18n/format';

const FILTERS = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Publiés' },
  { key: 'rejected', label: 'Refusés' },
];
const REASONS = [
  'Photos du bien manquantes ou floues',
  'Informations insuffisantes sur le bien ou le projet',
  'Ce n’est pas un projet d’investissement (vente simple)',
  'Papiers du bien douteux',
  'Contenu inapproprié',
];

/** Admin: land owners' projects wait here before going public. */
export default function AdminProjectsPage() {
  const { t, lang } = useT();
  const [status, setStatus] = useState('pending');
  const [projects, setProjects] = useState([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/projects', { params: { status }, localize: false });
      setProjects(data.projects);
      setPending(data.pending);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [status]);

  const act = async (p, action) => {
    if (action === 'delete' && !confirm(t('Supprimer ce projet définitivement ?'))) return;
    setBusy(p._id);
    try {
      if (action === 'approve') await api.put(`/admin/projects/${p._id}/approve`);
      else if (action === 'reject') await api.put(`/admin/projects/${p._id}/reject`, { reason: reason.trim() });
      else await api.delete(`/projects/${p._id}`);
      setRejecting(null);
      setReason('');
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title flex items-center gap-2">
          <Landmark className="h-6 w-6 text-[#00B3D2]" aria-hidden="true" /> {t('Projets d’investissement')}
        </h1>
        <p className="admin-page-subtitle">{pending > 0 ? t('{n} projet(s) en attente de validation', { n: pending }) : t('Aucun projet en attente')}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('Filtrer les projets')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={status === f.key}
            onClick={() => setStatus(f.key)}
            className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${status === f.key ? 'bg-brand-500 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
          >
            {t(f.label)}
            {f.key === 'pending' && pending > 0 && <span className="ms-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-white">{pending}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">{t('Chargement...')}</p>
      ) : error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-600">{error}</p>
      ) : projects.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-gray-400 shadow-card">{t('Aucun projet.')}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((p) => (
            <article key={p._id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
              {p.images?.[0] && <img src={getImageUrl(p.images[0].url)} alt="" className="aspect-[16/8] w-full object-cover" />}
              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs text-gray-400">
                  <span className="me-1 rounded-full bg-cyan-50 px-2 py-0.5 font-bold text-cyan-800">{isCapital(p) ? t('Investisseur cherche un bien') : t('Bien cherchant un investisseur')}</span>
                  {p.reference} · {new Date(p.updatedAt).toLocaleString(dateLocale())}
                </p>
                <p className="font-bold text-ink">{p.title}</p>
                {isCapital(p) ? (
                  <>
                    <p className="text-sm text-gray-500">{placeLabel(p, t)} · {assetLabel(p, t)} · {areaRange(p, t, lang)} · {t(p.projectType)} · {t(p.partnership)}</p>
                    <p className="text-sm font-semibold text-gray-700">{t('Budget')} : {budgetRange(p, t, formatDZD)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      {t(p.city)}, {t(p.wilaya)} · {assetLabel(p, t)} · {formatArea(p.area, lang)} · {t(p.projectType)} · {t(p.partnership)} · {documentLabel(p, t)}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">{p.budget ? formatDZD(p.budget) : t('Budget à définir')}{p.ownerShare != null ? ` · ${t('Part du propriétaire')} ${p.ownerShare} %` : ''}</p>
                  </>
                )}
                {p.description && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-gray-600">{p.description}</p>}
                {/* Ownership document photos: private, for checking the property before publishing (none for an investor's search) */}
                {!isCapital(p) && <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-gray-600">{t('Document de propriété')} : {documentLabel(p, t)}</p>
                  {p.documentImages?.length ? (
                    <div className="mt-2 flex gap-2">
                      {p.documentImages.map((d, i) => (
                        <a key={d.publicId} href={getImageUrl(d.url)} target="_blank" rel="noopener noreferrer" title={t('Ouvrir en grand')} className="block h-24 w-20 overflow-hidden rounded-lg ring-1 ring-slate-200 hover:ring-[#00B3D2]">
                          <img src={getImageUrl(d.url)} alt={`${t('Document de propriété')} ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">{t('Aucune photo du document.')}</p>
                  )}
                </div>}
                <p className="mt-2 text-xs text-gray-500">{p.owner?.fullName} · {p.owner?.email}{p.owner?.phone ? ` · ${p.owner.phone}` : ''}</p>
                {p.status === 'rejected' && p.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><strong>{t('Motif du refus :')}</strong> {p.rejectionReason}</p>
                )}

                {rejecting === p._id && (
                  <form
                    className="mt-3 space-y-2 rounded-xl border border-red-100 bg-red-50/40 p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (reason.trim().length >= 3) act(p, 'reject');
                    }}
                  >
                    <p className="text-xs font-bold text-red-800">{t('Motif du refus (envoyé au propriétaire)')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REASONS.map((x) => (
                        <button key={x} type="button" onClick={() => setReason(t(x))} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reason === t(x) ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-100 bg-white text-red-700 hover:bg-red-50'}`}>
                          {t(x)}
                        </button>
                      ))}
                    </div>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder={t('Ou écrivez le motif…')} className="w-full resize-none rounded-lg border border-red-100 bg-white px-3 py-2 text-sm outline-none focus:border-red-300" />
                    <div className="flex gap-2">
                      <button type="submit" disabled={busy === p._id || reason.trim().length < 3} className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40">
                        <XCircle className="h-4 w-4" aria-hidden="true" /> {t('Confirmer le refus')}
                      </button>
                      <button type="button" onClick={() => { setRejecting(null); setReason(''); }} className="min-h-[34px] rounded-lg px-3 text-xs font-semibold text-gray-500 hover:bg-gray-100">{t('Annuler')}</button>
                    </div>
                  </form>
                )}

                <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-50 pt-3">
                  {p.status !== 'approved' && (
                    <button disabled={busy === p._id} onClick={() => act(p, 'approve')} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" /> {t('Publier')}
                    </button>
                  )}
                  {p.status !== 'rejected' && rejecting !== p._id && (
                    <button disabled={busy === p._id} onClick={() => { setRejecting(p._id); setReason(''); }} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      <XCircle className="h-4 w-4" aria-hidden="true" /> {t('Refuser')}
                    </button>
                  )}
                  <button disabled={busy === p._id} onClick={() => act(p, 'delete')} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> {t('Supprimer')}
                  </button>
                  <Link href={`/investir/${p._id}`} target="_blank" className="ms-auto inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                    {t('Voir le projet')} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
