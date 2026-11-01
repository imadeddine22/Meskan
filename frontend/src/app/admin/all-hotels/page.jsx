'use client';

import { useEffect, useState } from 'react';
import { MapPin, Star, Trash2, Eye, Building2, Plus, X, CheckCircle, XCircle, Pencil } from 'lucide-react';
import MapPicker from '@/components/MapPicker';
import { useWilayas, regionsFor } from '@/hooks/useWilayas';
import api, { getImageUrl, getServerURL, resolveImg } from '@/lib/api';
import { formatDZD } from '@/lib/data';

import ChangedBadge from '@/components/ChangedBadge';
import { useT } from '@/lib/i18n/useT';
import AdminHotelDetails from '@/components/AdminHotelDetails';
import CountrySelect from '@/components/CountrySelect';
import { currencyOf } from '@/lib/countries';
import PoliciesFields, { DEFAULT_POLICIES, policiesOf } from '@/components/PoliciesFields';
import { MULTI_COUNTRY } from '@/lib/countries';
export default function AdminAllHotelsPage() {
  const { t } = useT();
  const { wilayas, addWilaya } = useWilayas();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const TYPES = ['Luxe', 'Affaires', 'Balnéaire', 'Riad', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'];

  // Static WILAYA_NAMES removed, loaded dynamically via useWilayas hook.

  const SERVER = getServerURL();
  function resolveImg(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SERVER}${url}`;
  }

  const emptyForm = {
    name: '', description: '', country: 'DZ', wilaya: '', city: '', address: '',
    starRating: 3, type: 'Économique', amenities: '', status: 'approved', lat: '', lng: '', suitableFor: [], policies: { ...DEFAULT_POLICIES },
    owner: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showWilayaModal, setShowWilayaModal] = useState(false);
  const [tempWilaya, setTempWilaya] = useState('');
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      const list = data.users?.filter(u => u.role === 'admin' || u.role === 'owner') || [];
      setOwners(list);
    }).catch(() => {});
  }, []);

  const openEdit = (hotel) => {
    setForm({
      name: hotel.name, description: hotel.description || '', country: hotel.country || 'DZ', wilaya: hotel.wilaya,
      city: hotel.city, address: hotel.address || '', type: hotel.type,
      starRating: hotel.starRating, status: hotel.status,
      amenities: hotel.amenities?.join(', ') || '',
      suitableFor: hotel.suitableFor || [],
      policies: policiesOf(hotel),
      lat: hotel.coordinates?.lat ?? '', lng: hotel.coordinates?.lng ?? '',
      owner: hotel.owner?._id || hotel.owner || ''
    });
    setEditingId(hotel._id);
    setShowModal(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (search) params.q = search;
      const { data } = await api.get('/admin/hotels/all', { params });
      setHotels(data.hotels);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(t('Êtes-vous sûr de supprimer "{name}" ?', { name }))) return;
    try {
      await api.delete(`/admin/hotels/${id}`);
      setHotels((h) => h.filter((x) => x._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const [viewingHotel, setViewingHotel] = useState(null);
  const [rejectingHotel, setRejectingHotel] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleStatusChange = async (id, action, reason = '') => {
    try {
      const { data } = await api.put(`/admin/hotels/${id}/${action}`, { reason });
      setHotels((prev) => prev.map((h) => h._id === id ? { ...h, status: data.hotel.status, rejectionReason: data.hotel.rejectionReason } : h));
      setViewingHotel(null);
      setRejectingHotel(null);
      setRejectionReason('');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
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
      
      if (editingId) {
        const { data } = await api.put(`/admin/hotels/${editingId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setHotels((prev) => prev.map(h => h._id === editingId ? data.hotel : h));
      } else {
        const { data } = await api.post('/admin/hotels', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setHotels((prev) => [data.hotel, ...prev]);
      }
      
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e) {
      setFormError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="admin-page-title">{t('Tous les hôtels')}</h1>
          <p className="admin-page-subtitle">{t('Hébergements disponibles sur la plateforme')}</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14 }}
        >
          <Plus style={{ width: 18, height: 18 }} /> {t('Ajouter un hôtel')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="admin-table-filters">
          {[
            { label: 'Tous', value: '' },
            { label: 'Approuvé', value: 'approved' },
            { label: 'En attente', value: 'pending' },
            { label: 'Modifiés', value: 'changed' }, // approved, then edited by the owner (still online)
            { label: 'Rejeté', value: 'rejected' },
          ].map((f) => (
            <button
              key={f.value}
              className={`admin-filter-btn ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto" style={{ maxWidth: '100%' }}>
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
        <form onSubmit={handleSearch} style={{ marginLeft: 'auto' }}>
          <input
            type="text"
            placeholder={t('Rechercher un hôtel...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            style={{ width: 240 }}
          />
        </form>
      </div>

      {loading ? (
        <div className="admin-hotels-scroll">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="admin-hotel-card">
              <div className="admin-skeleton" style={{ width: '100%', height: 150 }} />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="admin-skeleton" style={{ width: '70%', height: 16 }} />
                <div className="admin-skeleton" style={{ width: '50%', height: 12 }} />
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
              <Building2 />
            </div>
            <p className="admin-empty-title">{t('Aucun hôtel trouvé')}</p>
            <p className="admin-empty-desc">{t('Modifiez vos filtres pour voir plus de résultats')}</p>
          </div>
        </div>
      ) : (
        <div className="admin-hotels-scroll">
          {hotels.map((h) => (
            <div key={h._id} className="admin-hotel-card">
              <div style={{ position: 'relative' }}>
                <img
                  src={resolveImg(h.images?.[0]?.url) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'}
                  alt={h.name}
                  className="admin-hotel-card-img"
                />
                <span className={`admin-hotel-card-status ${h.status}`} style={{ position: 'absolute', top: 10, right: 10 }}>
                  {h.status === 'approved' ? t('Approuvé') : h.status === 'pending' ? t('En attente') : t('Rejeté')}
                </span>
              </div>
              <div className="admin-hotel-card-body">
                <h4 className="admin-hotel-card-name">{h.name}</h4>
                <p className="admin-hotel-card-location">
                  <MapPin /> {t(h.city)}, {t(h.wilaya)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  {[...Array(h.starRating || 0)].map((_, i) => (
                    <Star key={i} style={{ width: 13, height: 13, fill: '#f59e0b', color: '#f59e0b' }} />
                  ))}
                  {h.avgRating > 0 && (
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>{h.avgRating}</span>
                  )}
                </div>
                <div className="admin-hotel-card-footer">
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {h.owner?.fullName || '—'}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setViewingHotel(h)}
                      className="admin-btn"
                      style={{ padding: '4px 8px', fontSize: 11, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8 }}
                      title={t('Voir l\'offre')}
                    >
                      <Eye style={{ width: 13, height: 13 }} />
                    </button>
                    <ChangedBadge item={h} />
{(h.status !== 'approved' || h.changesToReview) && (
                      <button
                        onClick={() => handleStatusChange(h._id, 'approve')}
                        className="admin-btn"
                        style={{ padding: '4px 8px', fontSize: 11, background: '#e0f7fa', color: '#00bcd4', border: '1px solid #a7f3d0', borderRadius: 8 }}
                        title={t('Approuver')}
                      >
                        <CheckCircle style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                    {h.status !== 'rejected' && (
                      <button
                        onClick={() => { setRejectingHotel(h); setRejectionReason(''); }}
                        className="admin-btn"
                        style={{ padding: '4px 8px', fontSize: 11, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8 }}
                        title={t('Rejeter avec motif')}
                      >
                        <XCircle style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(h)}
                      className="admin-btn"
                      style={{ padding: '4px 10px', fontSize: 11, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8 }}
                      title={t('Modifier')}
                    >
                      <Pencil style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      onClick={() => handleDelete(h._id, h.name)}
                      className="admin-btn admin-btn-danger"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      title={t('Supprimer')}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Hotel Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '22px 26px', borderBottom: '1px solid #f1f5f9',
              position: 'sticky', top: 0, background: '#fff', borderRadius: '20px 20px 0 0'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                  {editingId ? t('Modifier l\'hôtel') : t('Ajouter un hôtel')}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>{t('Remplissez les informations de l\'hôtel')}</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); setForm(emptyForm); setEditingId(null); }}
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
                  <label style={labelStyle}>{t('Nom de l\'hôtel *')}</label>
                  <input required style={inputStyle} placeholder={t('ex: Hôtel El Aurassi')} value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Propriétaire *')}</label>
                  <select required style={inputStyle} value={form.owner}
                    onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                    <option value="">{t('Sélectionner le propriétaire (Moi ou Hôtelier)')}</option>
                    {owners.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.fullName} ({u.role === 'admin' ? t('Admin') : t('Hôtelier')}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('Type *')}</label>
                  <select required style={inputStyle} value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['Luxe','Affaires','Balnéaire','Riad','Boutique','Montagne','Désert','Appart-hôtel','Économique'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('Étoiles *')}</label>
                  <select required style={inputStyle} value={form.starRating}
                    onChange={(e) => setForm({ ...form, starRating: e.target.value })}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
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
                      style={{ fontSize: 11, color: '#34c77b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {t('+ Ajouter')}
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
                  <input required style={inputStyle} placeholder={t('ex: Alger Centre')} value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Adresse')}</label>
                  <input style={inputStyle} placeholder={t('Adresse complète')} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Description')}</label>
                  <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={t('Décrivez l\'hôtel...')}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Équipements (séparés par virgule)')}</label>
                  <input style={inputStyle} placeholder={t('ex: Wi-Fi, Piscine, Restaurant, Spa')}
                    value={form.amenities}
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
                  <label style={labelStyle}>{t('Statut')}</label>
                  <select style={inputStyle} value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="approved">{t('Approuvé')}</option>
                    <option value="pending">{t('En attente')}</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>{t('Localisation sur la carte')}</label>
                  <MapPicker
                    value={{ lat: form.lat, lng: form.lng }}
                    onChange={(lat, lng) => setForm((f) => ({ ...f, lat: lat ?? '', lng: lng ?? '' }))}
                    accent="#00bcd4"
                  />
                </div>
              </div>
              <PoliciesFields value={form.policies} onChange={(policies) => setForm((f) => ({ ...f, policies }))} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button"
                  onClick={() => { setShowModal(false); setFormError(''); setForm(emptyForm); setEditingId(null); }}
                  style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {t('Annuler')}
                </button>
                <button type="submit" disabled={submitting}
                  className="admin-btn admin-btn-primary"
                  style={{ padding: '10px 24px', fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? t('Enregistrement...') : editingId ? t('Mettre à jour') : t('Ajouter l\'hôtel')}
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
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)', padding: '24px 26px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{t('Ajouter une wilaya')}</h3>
              <button type="button" onClick={() => { setShowWilayaModal(false); setTempWilaya(''); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#64748b' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <input
              type="text"
              placeholder={t('Nom de la wilaya (ex: Ghardaïa)')}
              value={tempWilaya}
              onChange={(e) => setTempWilaya(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16, background: '#fff' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowWilayaModal(false); setTempWilaya(''); }}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                {t('Annuler')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!tempWilaya.trim()) return;
                  try {
                    const newW = await addWilaya(tempWilaya.trim());
                    setForm({ ...form, wilaya: newW });
                    setShowWilayaModal(false);
                    setTempWilaya('');
                  } catch (err) {
                    alert(err.message);
                  }
                }}
                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#34c77b', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                {t('Ajouter')}
              </button>
            </div>
          </div>
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

            {/* Rejection reason notice if rejected */}
            {viewingHotel.status === 'rejected' && viewingHotel.rejectionReason && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-200">
                <p className="text-xs font-bold text-red-800 uppercase">{t('Motif du refus enregistré :')}</p>
                <p className="mt-1 text-sm font-semibold text-red-700 italic">"{viewingHotel.rejectionReason}"</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <ChangedBadge item={viewingHotel} />
{(viewingHotel.status !== 'approved' || viewingHotel.changesToReview) && (
                <button
                  onClick={() => handleStatusChange(viewingHotel._id, 'approve')}
                  className="rounded-full bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  {t('Approuver l\'hôtel')}
                </button>
              )}
              {viewingHotel.status !== 'rejected' && (
                <button
                  onClick={() => {
                    setRejectingHotel(viewingHotel);
                    setRejectionReason('');
                  }}
                  className="rounded-full bg-amber-500 px-6 py-2.5 font-bold text-white shadow-md hover:bg-amber-600 transition"
                >
                  {t('Rejeter avec motif')}
                </button>
              )}
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
                onClick={() => handleStatusChange(rejectingHotel._id, 'reject', rejectionReason)}
                className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 transition"
              >
                {t('Confirmer le refus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6
};
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0',
  fontSize: 14, color: '#1e293b', outline: 'none', background: '#f8fafc',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};
