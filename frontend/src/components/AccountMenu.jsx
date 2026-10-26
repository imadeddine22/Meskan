'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, UserCircle, CalendarCheck, MessageCircle, BadgeDollarSign } from 'lucide-react';
import Link from '@/components/LocaleLink';
import Avatar from '@/components/Avatar';
import SpaceSwitcher from '@/components/SpaceSwitcher';
import { useAuthStore } from '@/store/authStore';
import { spaceHome } from '@/lib/spaces';
import { useT } from '@/lib/i18n/useT';

/** "Mon compte" in the navbar: open the current space, profile, bookings, and switch to another space. */
export default function AccountMenu() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!user) return null;
  const links = [
    { href: spaceHome(user.role), label: 'Ouvrir mon espace', icon: LayoutDashboard },
    { href: '/profile', label: 'Mon profil', icon: UserCircle },
    { href: '/my-bookings', label: 'Mes réservations', icon: CalendarCheck },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/pricing', label: 'Tarifs et abonnements', icon: BadgeDollarSign },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
      >
        <Avatar user={user} className="-ms-2 h-7 w-7 rounded-full text-xs" initialClassName="bg-brand-500 text-white" />
        {t.mySpace}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-80 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-3 border-b border-gray-100 px-1 pb-3">
            <Avatar user={user} className="h-10 w-10 rounded-full text-sm" initialClassName="bg-brand-500 text-white" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">{user.fullName}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <ul className="mb-3 border-b border-gray-100 pb-3">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <Link href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" /> {t(label)}
                </Link>
              </li>
            ))}
          </ul>
          <SpaceSwitcher onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
