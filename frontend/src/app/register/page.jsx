'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/LocaleLink';
import BrandLogo from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';
import { SPACE_ROLES, spaceHome } from '@/lib/spaces';
import PasswordInput from '@/components/PasswordInput';
import GoogleSignIn from '@/components/GoogleSignIn';

import { useT } from '@/lib/i18n/useT';
export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Links like "Publier une annonce" point to /register?role=owner: the new account opens that space right away
  // (it can switch at any time). Read from window rather than useSearchParams to keep the page static.
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('role');
    if (SPACE_ROLES.includes(role)) setForm((f) => ({ ...f, role }));
  }, []);

  const goOn = (user) => {
    router.push(user.role === 'customer' ? '/' : spaceHome(user.role));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      goOn(await register(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <Link href="/" className="mb-6 flex justify-center">
          <BrandLogo className="h-12" textClassName="text-3xl" />
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-ink">{t('Créer un compte')}</h1>
        <p className="mb-6 text-sm text-gray-500">{t('Rejoignez Meskan')}</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        {/* Everyone signs up as a traveller; the other spaces (host, seller, investor) open from the account menu */}
        <p className="mb-5 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          {t('Un seul compte pour tout : réservez, puis passez quand vous voulez à l’espace hôtels et locations, vente de biens ou investisseur depuis « Mon compte ».')}
        </p>

        <GoogleSignIn role={form.role} onSuccess={goOn} onError={setError} />

        <form onSubmit={submit} className="space-y-4">
          <Field label={t('Nom complet')} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <Field label={t('Email')} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label={t('Téléphone')} type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required={false} />
          <Field label={t('Mot de passe')} type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? t('Création...') : t('Créer mon compte')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('Déjà inscrit ?')}{' '}
          <Link href="/login" className="font-semibold text-brand-600">
            {t('Se connecter')}
          </Link>
        </p>
      </div>
    </div>
  );
}

const AUTOCOMPLETE = { email: 'email', password: 'new-password', tel: 'tel' };

function Field({ label, value, onChange, type = 'text', required = true }) {
  const id = useId();
  // password: with the eye button to show / hide it
  const isPassword = type === 'password';
  const Input = isPassword ? PasswordInput : 'input';
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <Input
        id={id}
        {...(isPassword ? {} : { type })}
        autoComplete={AUTOCOMPLETE[type]}
        minLength={isPassword ? 6 : undefined}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500"
      />
    </div>
  );
}
