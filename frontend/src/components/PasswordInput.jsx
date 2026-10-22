'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

/** Password field with an eye button to show / hide what was typed. Other props go to the <input>. */
export default function PasswordInput({ className = '', ...props }) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pe-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
        aria-pressed={show}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center text-gray-400 transition hover:text-gray-600"
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
