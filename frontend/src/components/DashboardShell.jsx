'use client';

import { useEffect } from 'react';
import Link from '@/components/LocaleLink';
import BrandLogo from '@/components/BrandLogo';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Hotel, CalendarCheck, Users, CheckSquare, LogOut, Home, Mail, Globe, Tag, MessageCircle, Send, Bookmark, Landmark, FolderPlus, BadgeDollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AccountMenu from '@/components/AccountMenu';
import { SPACE_ROLES } from '@/lib/spaces';

import { useT } from '@/lib/i18n/useT';

const MENUS = {
  owner: [
    { href: '/owner/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/owner/my-hotels', label: 'Mes hôtels', icon: Hotel },
    { href: '/owner/my-houses', label: 'Mes maisons', icon: Home },
    { href: '/owner/bookings', label: 'Réservations', icon: CalendarCheck },
    { href: '/pricing', label: 'Tarifs et abonnements', icon: BadgeDollarSign },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/', label: 'Site public', icon: Globe },
  ],
  seller: [
    { href: '/seller/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/seller/my-listings', label: 'Mes annonces', icon: Tag },
    { href: '/pricing', label: 'Tarifs et abonnements', icon: BadgeDollarSign },
    { href: '/', label: 'Site public', icon: Globe },
  ],
  investor: [
    { href: '/investor/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/investor/projects', label: 'Mes projets publiés', icon: FolderPlus },
    { href: '/investor/requests', label: 'Mes demandes', icon: Send },
    { href: '/investor/saved', label: 'Projets sauvegardés', icon: Bookmark },
    { href: '/investir', label: 'Explorer les projets', icon: Landmark },
    { href: '/', label: 'Site public', icon: Globe },
  ],
  admin: [
    { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/admin/hotels', label: 'Validations', icon: CheckSquare },
    { href: '/admin/all-hotels', label: 'Tous les hôtels', icon: Hotel },
    { href: '/admin/all-houses', label: 'Toutes les maisons', icon: Home },
    { href: '/admin/all-sales', label: 'Toutes les ventes', icon: Tag },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/admin/messages', label: 'Messages', icon: Mail },
    { href: '/admin/bookings', label: 'Réservations', icon: CalendarCheck },
    { href: '/', label: 'Site public', icon: Globe },
  ],
};

export default function DashboardShell({ role, title, children }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout, switchSpace } = useAuthStore();
  // Opening another space's page (e.g. a link to /seller/dashboard) switches the account to that space
  const otherSpace = Boolean(user) && user.role !== role && user.role !== 'admin';

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?redirect=' + pathname);
    else if (otherSpace) {
      if (SPACE_ROLES.includes(role)) switchSpace(role).catch(() => router.replace('/'));
      else router.replace('/');
    }
  }, [user, loading, role, router, pathname, otherSpace, switchSpace]);

  if (loading || !user || otherSpace) {
    return <div className="grid min-h-screen place-items-center text-gray-400 bg-[#f8f9fc]">{t('Loading...')}</div>;
  }

  const menu = MENUS[role] || [];

  return (
    <div className="flex min-h-screen bg-[#f3f4f8] font-sans text-gray-800">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-white px-5 py-6 md:flex border-r border-gray-100">
        <Link href="/" className="mb-10 flex items-center px-2">
          <BrandLogo className="h-10" />
        </Link>

        <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('Menu')}</p>
        
        <nav className="flex flex-1 flex-col gap-2">
          {menu.map((m) => {
            const Icon = m.icon;
            const active = pathname === m.href;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                    : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-400'}`} /> 
                {t(m.label)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => { await logout(); router.push('/'); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="h-5 w-5 text-red-400" /> {t('Déconnexion')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between px-8 py-4">
          
          {/* Search box and notification bell removed: they were placeholders with no behaviour */}
          <div className="flex items-center gap-6 ml-auto">

            {/* Account menu: profile, bookings and the other spaces (host, seller, investor…) */}
            <AccountMenu />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-4 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
