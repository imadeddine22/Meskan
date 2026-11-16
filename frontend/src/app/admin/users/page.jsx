'use client';

import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Trash2, Search, Users, KeyRound, Copy, Check, X } from 'lucide-react';
import api from '@/lib/api';

import { useT } from '@/lib/i18n/useT';
import { dateLocale } from '@/lib/i18n/format';
import Avatar from '@/components/Avatar';
const ROLE_COLORS = {
  admin: '#8b5cf6',
  owner: '#3b82f6',
  seller: '#10b981',
  investor: '#00B3D2',
  customer: '#64748b',
};

const ROLE_LABELS = { admin: 'Admin', owner: 'Hôtelier', seller: 'Vendeur', investor: 'Investisseur', customer: 'Client' };

export default function AdminUsersPage() {
  const { t } = useT();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reset, setReset] = useState(null); // { user, tempPassword } shown once after a password reset
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search) params.q = search;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const toggleBlock = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/${id}/block`);
      setUsers((u) => u.map((x) => (x._id === id ? { ...x, isBlocked: data.user.isBlocked } : x)));
    } catch (e) {
      alert(e.message);
    }
  };

  // Forgotten password without email: a temporary password the admin gives by phone / WhatsApp
  const resetPassword = async (u) => {
    if (!confirm(t('Créer un mot de passe temporaire pour {name} ? Son ancien mot de passe ne marchera plus.', { name: u.fullName }))) return;
    try {
      const { data } = await api.put(`/admin/users/${u._id}/reset-password`);
      setCopied(false);
      setReset({ user: data.user, tempPassword: data.tempPassword });
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(t('Supprimer l\'utilisateur "{name}" ?', { name }))) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((u) => u.filter((x) => x._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('Utilisateurs')}</h1>
        <p className="admin-page-subtitle">{t('Gestion des comptes utilisateurs ·')} {users.length} {t('membres')}</p>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <div className="admin-table-filters">
            {[
              { label: 'Tous', value: '' },
              { label: 'Clients', value: 'customer' },
              { label: 'Hôteliers', value: 'owner' },
              { label: 'Vendeurs', value: 'seller' },
              { label: 'Investisseurs', value: 'investor' },
              { label: 'Admins', value: 'admin' },
            ].map((f) => (
              <button
                key={f.value}
                className={`admin-filter-btn ${roleFilter === f.value ? 'active' : ''}`}
                onClick={() => setRoleFilter(f.value)}
              >
                {t(f.label)}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={t('Rechercher...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-search-input"
                style={{ width: 200, paddingLeft: 36 }}
              />
            </div>
          </form>
        </div>

        {loading ? (
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="admin-skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
                <div className="admin-skeleton" style={{ flex: 1, height: 16 }} />
                <div className="admin-skeleton" style={{ width: 80, height: 16 }} />
                <div className="admin-skeleton" style={{ width: 60, height: 24, borderRadius: 20 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 22 }}>
            <div className="admin-error">{error}</div>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon"><Users /></div>
            <p className="admin-empty-title">{t('Aucun utilisateur trouvé')}</p>
            <p className="admin-empty-desc">{t('Modifiez vos filtres pour voir plus de résultats')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('Utilisateur')}</th>
                  <th>{t('Email')}</th>
                  <th>{t('Rôle')}</th>
                  <th>{t('Statut')}</th>
                  <th>{t('Inscrit le')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="admin-table-user">
                        <Avatar user={u} className="admin-table-avatar" initialClassName="text-white" />
                        <span className="admin-table-username">{u.fullName}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.role}`}>
                        {t(ROLE_LABELS[u.role] || u.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.isBlocked ? 'blocked' : 'active'}`}>
                        {u.isBlocked ? t('Bloqué') : t('Actif')}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#94a3b8' }}>
                      {new Date(u.createdAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.role !== 'admin' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => toggleBlock(u._id)}
                            className={`admin-btn ${u.isBlocked ? 'admin-btn-approve' : 'admin-btn-reject'}`}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            {u.isBlocked ? (
                              <><CheckCircle2 style={{ width: 14, height: 14 }} /> {t('Débloquer')}</>
                            ) : (
                              <><Ban style={{ width: 14, height: 14 }} /> {t('Bloquer')}</>
                            )}
                          </button>
                          <button
                            onClick={() => resetPassword(u)}
                            className="admin-btn"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            title={t('Mot de passe oublié : en créer un temporaire')}
                            aria-label={t('Mot de passe oublié : en créer un temporaire')}
                          >
                            <KeyRound style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            onClick={() => deleteUser(u._id, u.fullName)}
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            title={t('Supprimer')}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {reset && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" onClick={() => setReset(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="reset-title" className="flex items-center gap-2 text-lg font-bold text-ink">
                <KeyRound className="h-5 w-5 text-teal-600" aria-hidden="true" /> {t('Mot de passe temporaire')}
              </h2>
              <button type="button" onClick={() => setReset(null)} aria-label={t('Fermer')} className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {reset.user.fullName} · {reset.user.email}{reset.user.phone ? ` · ${reset.user.phone}` : ''}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <code dir="ltr" className="flex-1 text-center text-2xl font-black tracking-widest text-ink">{reset.tempPassword}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(reset.tempPassword).then(() => setCopied(true))}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white hover:bg-teal-700"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? t('Copié') : t('Copier')}
              </button>
            </div>
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {t('Envoyez-le au client par téléphone ou WhatsApp. Il se connecte avec, puis le change dans « Mon profil ». Ce mot de passe ne sera plus affiché.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
