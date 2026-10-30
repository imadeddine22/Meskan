'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/LocaleLink';
import BrandLogo from '@/components/BrandLogo';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Hotel,
  CalendarCheck,
  Users,
  CheckSquare,
  LogOut,
  Bell,
  Settings,
  ChevronDown,
  Menu,
  X,
  Building2,
  Home,
  Mail,
  Tag,
  MessageSquareQuote,
  Star,
  Megaphone,
  Clapperboard,
  Landmark,
  Radio,
  MessagesSquare,
} from 'lucide-react';
import api from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

import { useT } from '@/lib/i18n/useT';
const ADMIN_MENU = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/hotels', label: 'Approbations', icon: CheckSquare },
  { href: '/admin/all-hotels', label: 'Tous les hôtels', icon: Building2 },
  { href: '/admin/featured', label: 'Hôtels en vedette', icon: Star },
  { href: '/admin/meta', label: 'Publicité Meta', icon: Megaphone },
  { href: '/admin/reels', label: 'Reels', icon: Clapperboard },
  { href: '/admin/projects', label: 'Projets d’investissement', icon: Landmark },
  { href: '/admin/all-houses', label: 'Toutes les maisons', icon: Home },
  { href: '/admin/all-sales', label: 'Ventes immobilières', icon: Tag },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/support', label: 'Discussions', icon: MessagesSquare }, // users write only to Meskan
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/testimonials', label: 'Avis clients', icon: MessageSquareQuote },
  { href: '/admin/referrals', label: 'Comment ils nous ont connus', icon: Radio },
  { href: '/admin/bookings', label: 'Réservations', icon: CalendarCheck },
  { href: '/admin/pricing', label: 'Tarification', icon: Settings },
];

export default function AdminLayout({ children }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout, isRole } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [pendingReels, setPendingReels] = useState(0);
  const [pendingProjects, setPendingProjects] = useState(0);
  const unreadChats = useUnreadMessages(user); // users' messages waiting for Meskan

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?redirect=' + pathname);
    else if (!isRole('admin')) router.replace('/');
  }, [user, loading, router, pathname]);

  // Pull the unread-message count for the bell + Messages badge.
  useEffect(() => {
    if (!user || !isRole('admin')) return;
    api.get('/messages')
      .then(({ data }) => setUnread((data.messages || []).filter((m) => !m.isRead).length))
      .catch(() => {});
    api.get('/testimonials/admin?status=pending', { localize: false })
      .then(({ data }) => setPendingReviews(data.pending || 0))
      .catch(() => {});
    api.get('/admin/reels?status=pending', { localize: false })
      .then(({ data }) => setPendingReels(data.pending || 0))
      .catch(() => {});
    api.get('/admin/projects?status=pending', { localize: false })
      .then(({ data }) => setPendingProjects(data.pending || 0))
      .catch(() => {});
  }, [user, pathname]);

  if (loading || !user) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>{t('Chargement...')}</p>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link href="/" className="admin-logo">
            <BrandLogo className="h-9" textClassName="text-xl" />
          </Link>
          <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="admin-nav">
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const badge = item.href === '/admin/support' ? unreadChats : item.href === '/admin/messages' ? unread : item.href === '/admin/testimonials' ? pendingReviews : item.href === '/admin/reels' ? pendingReels : item.href === '/admin/projects' ? pendingProjects : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`admin-nav-item ${active ? 'active' : ''}`}
              >
                <Icon className="admin-nav-icon" />
                <span>{t(item.label)}</span>
                {badge > 0 && <span className="admin-nav-badge">{badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            onClick={async () => { await logout(); router.push('/'); }}
            className="admin-nav-item logout"
          >
            <LogOut className="admin-nav-icon" />
            <span>{t('Déconnexion')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button className="admin-menu-btn" onClick={() => setSidebarOpen(true)} aria-label={t('Ouvrir le menu')}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="admin-topbar-right">
            <Link href="/admin/messages" className="admin-notif-btn" aria-label={t('Messages')}>
              <Bell className="w-5 h-5" />
              {unread > 0 && <span className="admin-notif-badge">{unread}</span>}
            </Link>
            <div className="admin-profile-wrapper">
              <button
                className="admin-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <Avatar user={user} className="admin-avatar" initialClassName="" />
                <div className="admin-profile-info">
                  <span className="admin-profile-name">{user.fullName}</span>
                  <span className="admin-profile-role">{t('Administrateur')}</span>
                </div>
                <ChevronDown className={`admin-chevron ${profileOpen ? 'rotated' : ''}`} />
              </button>
              {profileOpen && (
                <div className="admin-profile-dropdown">
                  <Link href="/profile" className="admin-dropdown-item">
                    <Settings className="w-4 h-4" /> {t('Mon profil et ma photo')}
                  </Link>
                  <button
                    onClick={async () => { await logout(); router.push('/'); }}
                    className="admin-dropdown-item danger"
                  >
                    <LogOut className="w-4 h-4" /> {t('Déconnexion')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
