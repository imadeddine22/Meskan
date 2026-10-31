'use client';

import { statusLabel } from '@/lib/statusLabels';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, MapPin, Trash2, BedDouble, Bath, Users, X, Home, Pencil } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import MapPicker from '@/components/MapPicker';
import ImageUploader from '@/components/ImageUploader';
import { useWilayas, regionsFor } from '@/hooks/useWilayas';
import CommuneDatalist from '@/components/CommuneDatalist';
import api from '@/lib/api';

import { getServerURL } from '@/lib/api';

import { useT } from '@/lib/i18n/useT';
import CountrySelect from '@/components/CountrySelect';
import { currencyOf } from '@/lib/countries';
import PoliciesFields, { DEFAULT_POLICIES, policiesOf } from '@/components/PoliciesFields';
import { MULTI_COUNTRY } from '@/lib/countries';
import DiscountFields from '@/components/DiscountFields';
import RentFeeNotice from '@/components/RentFeeNotice';
import { RENTAL_PERIODS, periodOf, rentPrices } from '@/lib/rentals';
import PromoteListing from '@/components/PromoteListing';
import ReelManager from '@/components/ReelManager';
const SERVER = getServerURL();
function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${SERVER}${url}`;
}

const STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
};

const HOUSE_TYPES = ['Villa', 'Appartement', 'Maison', 'Chalet', 'Studio', 'Duplex', 'Riad', 'Ferme', 'Luxe', 'Affaires', 'Balnéaire', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'];

const emptyForm = {
  name: '', description: '', country: 'DZ', wilaya: '', city: '', address: '',
  type: 'Maison', starRating: 3, rooms: 1, bathrooms: 1, capacity: 2,
  rentalPeriod: 'daily', pricePerNight: '', pricePerMonth: '', pricePerYear: '', amenities: '', lat: '', lng: '', suitableFor: [], policies: { ...DEFAULT_POLICIES }, discountPercent: 0, discountUntil: '',
};

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', outline: 'none' };

function MyHousesContent() {
  const { t } = useT();
  const { wilayas, addWilaya } = useWilayas();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showWilayaModal, setShowWilayaModal] = useState(false);
  const [tempWilaya, setTempWilaya] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingId(null);
      setForm(emptyForm);
      setShowModal(true);
    }
  }, [searchParams]);

  const openEdit = (house) => {
    setForm({
      name: house.name, description: house.description || '', country: house.country || 'DZ', wilaya: house.wilaya,
      city: house.city, address: house.address || '', type: house.type, starRating: house.starRating || 3,
      rooms: house.rooms, bathrooms: house.bathrooms, capacity: house.capacity,
      rentalPeriod: periodOf(house), pricePerNight: house.pricePerNight || '', pricePerMonth: house.pricePerMonth || '', pricePerYear: house.pricePerYear || '', amenities: house.amenities?.join(', ') || '',
      suitableFor: house.suitableFor || [],
      policies: policiesOf(house),
      discountPercent: house.discountPercent || 0, discountUntil: house.discountUntil ? String(house.discountUntil).slice(0, 10) : '',
      lat: house.coordinates?.lat ?? '', lng: house.coordinates?.lng ?? '',
      existingImages: house.images || []
    });
    setEditingId(house._id);
    setShowModal(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { type: typeFilter } : {};
      const { data } = await api.get('/houses/my/list', { params });
      setHouses(data.houses);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [typeFilter]);

  const remove = async (id) => {
    if (!confirm(t('Supprimer cette maison ?'))) return;
    try { await api.delete(`/houses/${id}`); load(); } catch (e) { alert(e.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'suitableFor') payload.append(k, v.join(','));
        else if (k === 'policies') payload.append(k, JSON.stringify(v));
        else payload.append(k, v);
      });
      if (files) {
        Array.from(files).forEach((f) => payload.append('images', f));
      }
      
      if (editingId) {
        await api.put(`/houses/${editingId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/houses', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      setShowModal(false);
      setForm(emptyForm);
      setFiles(null);
      setEditingId(null);
      load();
    } catch (e) {
      setFormError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell role="owner" title={t('Mes maisons')}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1" style={{ maxWidth: '100%' }}>
          <button
            onClick={() => setTypeFilter('')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${!typeFilter ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 bg-white'}`}
          >
            {t('Tous les types')}
          </button>
          {HOUSE_TYPES.map((item) => (
            <button
              key={item}
              onClick={() => setTypeFilter(item)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${typeFilter === item ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 bg-white'}`}
            >
              {t(item)}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
          className="shrink-0 flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> {t('Ajouter une maison')}
        </button>
      </div>

      {/* Meskan's fees, so the owner knows them before publishing */}
      <RentFeeNotice className="mb-6" />

      {loading ? (
        <p className="text-gray-500">{t('Chargement...')}</p>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-600 border border-red-100">{error}</p>
      ) : houses.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center shadow-sm">
          <Home className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500 font-medium">{t('Aucune maison. Ajoutez votre première maison.')}</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {houses.map((h) => (
            <div key={h._id} className="overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm transition hover:shadow-md">
              <div className="relative h-40">
                {h.images?.[0]?.url ? (
                  <img src={resolveImg(h.images[0].url)} alt={h.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-5">
                    <Home className="h-12 w-12 text-purple-200" />
                  </div>
                )}
                <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS[h.status]}`}>
                  {t(statusLabel(h.status))}
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-brand-500">
                  {t(h.type)}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">{h.name}</h3>
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 text-brand-500" /> {t(h.city)}, {t(h.wilaya)}
                </p>
                <div className="mt-2 flex gap-3 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {h.rooms} {t('ch.')}</span>
                  <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {h.bathrooms} {t('SDB')}</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {h.capacity} {t('pers.')}</span>
                </div>

                {h.status === 'rejected' && (
                  <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    <span className="font-bold block text-red-800">{t('⚠️ Maison rejetée par l\'administration :')}</span>
                    <p className="mt-1 text-red-600 font-medium italic">
                      "{h.rejectionReason || t('Aucun motif spécifié. Veuillez vérifier les informations.')}"
                    </p>
                  </div>
                )}
                <p className="mt-2 text-xs font-semibold text-brand-600">{t(RENTAL_PERIODS.find((p) => p.key === periodOf(h))?.label)}</p>
                {rentPrices(h).filter((x) => x.amount > 0).map(({ amount, unit }) => (
                  <p key={unit} className="font-bold text-brand-500">
                    {amount.toLocaleString('fr-DZ')} {h.currency || 'DZD'}<span className="text-xs font-normal text-gray-400"> {t(unit)}</span>
                  </p>
                ))}
                <div className="mt-3 flex gap-2">
                  <PromoteListing kind="house" listing={h} className="flex-1" />
                  <ReelManager kind="house" listing={h} />
                  <button onClick={() => openEdit(h)} className="grid w-10 place-items-center rounded-lg bg-gray-50 py-2 text-gray-500 hover:bg-gray-100 transition">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(h._id)} className="grid w-10 place-items-center rounded-lg bg-red-50 py-2 text-red-500 hover:bg-red-100 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, width: '100%', maxWidth: 600,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '22px 26px', borderBottom: '1px solid #f1f5f9',
              position: 'sticky', top: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 10
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                  {editingId ? t('Modifier la maison') : t('Ajouter une maison')}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>{t('Votre maison sera soumise pour approbation')}</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); setForm(emptyForm); setFiles(null); setEditingId(null); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#64748b' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Nom *')}</label>
                  <input required style={inputStyle} placeholder={t('ex: Villa Yasmine')} value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>{t('Type *')}</label>
                  <select required style={inputStyle} value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {HOUSE_TYPES.map(item => <option key={item} value={item}>{t(item)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('Étoiles *')}</label>
                  <select required style={inputStyle} value={form.starRating}
                    onChange={(e) => setForm({ ...form, starRating: e.target.value })}>
                    {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s} ★</option>)}
                  </select>
                </div>
                <div>
                  {MULTI_COUNTRY && (
<div>
                  <label style={labelStyle}>{t('Pays *')}</label>
                  <CountrySelect value={form.country} onChange={(c) => setForm((f) => ({ ...f, country: c, wilaya: '' }))} style={inputStyle} />
                </div>
)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>{t('Wilaya *')}</label>
                    <button
                      type="button"
                      onClick={() => setShowWilayaModal(true)}
                      style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {t('+ Ajouter une wilaya')}
                    </button>
                  </div>
                  <select required style={inputStyle} value={form.wilaya}
                    onChange={(e) => setForm({ ...form, wilaya: e.target.value })}>
                    <option value="">{t('Choisir une wilaya')}</option>
                    {regionsFor(form.country, wilayas).map(w => <option key={w} value={w}>{t(w)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('Ville *')}</label>
                  <input required style={inputStyle} placeholder={t('Choisissez ou saisissez une commune')} value={form.city} list="house-communes" autoComplete="off"
                    onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <CommuneDatalist id="house-communes" wilaya={form.wilaya} />
                </div>
                {/* How the house is rented: by the day (booked online), the month, the year, or month and year */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Type de location')} *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {RENTAL_PERIODS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        aria-pressed={form.rentalPeriod === p.key}
                        onClick={() => setForm({ ...form, rentalPeriod: p.key })}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${form.rentalPeriod === p.key ? 'bg-brand-500 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
                      >
                        {t(p.label)}
                      </button>
                    ))}
                  </div>
                  <RentFeeNotice period={form.rentalPeriod} className="mt-3" />
                </div>
                {form.rentalPeriod === 'daily' && (
                  <div>
                    <label style={labelStyle}>{t('Prix/nuit')} ({currencyOf(form.country)}) *</label>
                    <input type="number" min="0" required style={inputStyle} placeholder="5000" value={form.pricePerNight}
                      onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} />
                  </div>
                )}
                {['monthly', 'monthly_yearly'].includes(form.rentalPeriod) && (
                  <div>
                    <label style={labelStyle}>{t('Prix/mois')} ({currencyOf(form.country)}) *</label>
                    <input type="number" min="0" required style={inputStyle} placeholder="45000" value={form.pricePerMonth}
                      onChange={(e) => setForm({ ...form, pricePerMonth: e.target.value })} />
                  </div>
                )}
                {['yearly', 'monthly_yearly'].includes(form.rentalPeriod) && (
                  <div>
                    <label style={labelStyle}>{t('Prix/an')} ({currencyOf(form.country)}) *</label>
                    <input type="number" min="0" required style={inputStyle} placeholder="480000" value={form.pricePerYear}
                      onChange={(e) => setForm({ ...form, pricePerYear: e.target.value })} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>{t('Chambres')}</label>
                  <input type="number" min="1" style={inputStyle} value={form.rooms}
                    onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>{t('SDB')}</label>
                  <input type="number" min="1" style={inputStyle} value={form.bathrooms}
                    onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>{t('Capacité')}</label>
                  <input type="number" min="1" style={inputStyle} value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>{t('Adresse')}</label>
                  <input style={inputStyle} placeholder={t('Adresse')} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Description')}</label>
                  <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={t('Décrivez votre maison...')}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Équipements (séparés par virgule)')}</label>
                  <input style={inputStyle} placeholder={t('Wi-Fi, Piscine, Parking...')} value={form.amenities}
                    onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Idéal pour (Cochez les options applicables)')}</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    {['Familles', 'Amis', 'Couples', 'Solo', 'Affaires'].map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.suitableFor.includes(opt)}
                          onChange={(e) => {
                            if (e.target.checked) setForm({ ...form, suitableFor: [...form.suitableFor, opt] });
                            else setForm({ ...form, suitableFor: form.suitableFor.filter(x => x !== opt) });
                          }}
                        /> {t(opt)}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Localisation sur la carte')}</label>
                  <MapPicker
                    value={{ lat: form.lat, lng: form.lng }}
                    onChange={(lat, lng) => setForm((f) => ({ ...f, lat: lat ?? '', lng: lng ?? '' }))}
                    accent="#7c3aed"
                  />
                </div>
                <DiscountFields percent={form.discountPercent} until={form.discountUntil} onChange={(d) => setForm((f) => ({ ...f, ...d }))} />
                <PoliciesFields value={form.policies} onChange={(policies) => setForm((f) => ({ ...f, policies }))} />
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Photos (la première sera la photo principale)')}</label>
                  <ImageUploader 
                    onChange={(selectedFiles) => setFiles(selectedFiles)} 
                    maxFiles={6} 
                    existingImages={form.existingImages || []} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button"
                  onClick={() => { setShowModal(false); setFormError(''); setForm(emptyForm); setFiles(null); setEditingId(null); }}
                  style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {t('Annuler')}
                </button>
                <button type="submit" disabled={submitting}
                  style={{
                    padding: '10px 24px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submitting ? 0.7 : 1
                  }}>
                  {submitting ? t('Enregistrement...') : editingId ? t('Mettre à jour') : t('Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Wilaya Modal */}
      {showWilayaModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
            boxShadow: '0 25px 60px rgba(124,58,237,0.2)', padding: '28px 26px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{t('Ajouter une wilaya')}</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>{t('Entrez le nom de la nouvelle wilaya')}</p>
              </div>
              <button type="button" onClick={() => { setShowWilayaModal(false); setTempWilaya(''); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              placeholder={t('ex: Nouvelle Wilaya')}
              value={tempWilaya}
              onChange={(e) => setTempWilaya(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              style={{ ...inputStyle, marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowWilayaModal(false); setTempWilaya(''); }}
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                {t('Annuler')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const name = tempWilaya.trim();
                  if (!name) return;
                  try {
                    const newW = await addWilaya(name);
                    setForm(prev => ({ ...prev, wilaya: newW }));
                    setShowWilayaModal(false);
                    setTempWilaya('');
                  } catch (err) {
                    alert(err.message);
                  }
                }}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
                }}
              >
                {t('Ajouter')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default function MyHousesPage() {
  const { t } = useT();
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>{t('Chargement...')}</div>}>
      <MyHousesContent />
    </Suspense>
  );
}
