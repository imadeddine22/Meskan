'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/LocaleLink';
import PasswordInput from '@/components/PasswordInput';
import BrandLogo from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';
import { spaceHome } from '@/lib/spaces';
import GoogleSignIn from '@/components/GoogleSignIn';

import { useT } from '@/lib/i18n/useT';
export default function LoginPage() {
  const { t } = useT();
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-gray-400">{t('Chargement...')}</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  // Only same-site paths: "https://evil.com" or "//evil.com" would be an open redirect after login
  const rawRedirect = params.get('redirect');
  const redirect = rawRedirect && /^\/(?!\/)/.test(rawRedirect) && !rawRedirect.includes('\\') ? rawRedirect : null;
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goOn = (user) => {
    if (redirect) router.push(redirect);
    else if (user.role !== 'customer') router.push(spaceHome(user.role));
    else router.push('/');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      goOn(await login(form.email, form.password));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <Link href="/" className="mb-6 flex justify-center">
          <BrandLogo className="h-12" textClassName="text-3xl" />
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-ink">{t('Connexion')}</h1>
        <p className="mb-6 text-sm text-gray-500">{t('Accédez à votre compte')}</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        <GoogleSignIn onSuccess={goOn} onError={setError} />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">{t('Email')}</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500"
              placeholder={t('vous@exemple.com')}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">{t('Mot de passe')}</label>
              <Link href={form.email ? `/forgot-password?email=${encodeURIComponent(form.email)}` : '/forgot-password'} className="text-xs font-semibold text-brand-600 hover:underline">
                {t('Mot de passe oublié ?')}
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-brand-500"
              placeholder="••••••••"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? t('Connexion...') : t('Se connecter')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('Pas de compte ?')}{' '}
          <Link href="/register" className="font-semibold text-brand-600">
            {t('Créer un compte')}
          </Link>
        </p>
      </div>
    </div>
  );
}
