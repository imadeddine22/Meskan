'use client';

import { useState, useEffect, useRef } from 'react';
import Link from '@/components/LocaleLink';
import Avatar from '@/components/Avatar';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Menu, X, Heart, User, Globe, MessageCircle, LogOut } from 'lucide-react';
import { useAuthStore, useLangStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import BrandLogo, { brandName } from '@/components/BrandLogo';
import { useT } from '@/lib/i18n/useT';
import { useUrlLang } from '@/components/UrlLang';
import { localePath, splitLocale } from '@/lib/i18n/locale';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import AccountMenu from '@/components/AccountMenu';
import SpaceSwitcher from '@/components/SpaceSwitcher';
import { spaceHome } from '@/lib/spaces';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  const pathname = splitLocale(usePathname() || '/').path; // without the /ar, /en prefix
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { setLang } = useLangStore();
  const { t, lang } = useT();
  const urlLang = useUrlLang();
  const signOut = async () => {
    setOpen(false);
    await logout();
    router.push(localePath(urlLang, '/'));
  };

  const { hotelIds, houseIds, load } = useFavoritesStore();
  const [anonCount, setAnonCount] = useState(0);

  const updateAnonCount = () => {
    if (typeof window !== 'undefined') {
      try {
        const favs = JSON.parse(localStorage.getItem('anon_favorites')) || { hotels: [], houses: [] };
        const count = (favs.hotels?.length || 0) + (favs.houses?.length || 0);
        setAnonCount(count);
      } catch {
        setAnonCount(0);
      }
    }
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);

  useEffect(() => {
    updateAnonCount();
    window.addEventListener('favorites-updated', updateAnonCount);
    window.addEventListener('storage', updateAnonCount);
    return () => {
      window.removeEventListener('favorites-updated', updateAnonCount);
      window.removeEventListener('storage', updateAnonCount);
    };
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langOpen]);

  const totalFavorites = user ? (hotelIds.length + houseIds.length) : anonCount;
  const unreadMessages = useUnreadMessages(user);

  // Public pages: go to the same page's URL in that language (/ar/hotels…), rendered by the
  // server in it. Private pages have one URL: reload so listings are fetched again, localized.
  const changeLang = (code) => {
    if (code === lang) return;
    setLang(code);
    if (urlLang) window.location.assign(localePath(code, splitLocale(pathname).path) + window.location.search);
    else window.location.reload();
  };

  const dashHref = spaceHome(user?.role);

  const navLinks = [
    { label: t.navHome, href: '/' },
    { label: t.navHotels, href: '/hotels' },
    { label: t.navHouses, href: '/houses' },
    { label: t.navSales || 'Ventes', href: '/sales' },
    { label: 'Reels', href: '/reels' },
    { label: t.navDestinations, href: '/destinations' },
    // land owners & investors
    { label: 'Investir', href: '/investir' },
    // plans for hosts and sellers: phone menu only (the computer menu is full at 1280 px; computers
    // have it in the home quick-access list and the account menu)
    { label: 'Tarifs', href: '/pricing', mobileOnly: true },
    // the contact form goes straight to the site owner (Admin → Messages)
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 2xl:gap-10">
        
        {/* Left: Brand Logo */}
        <Link href="/" className="-ms-1 flex items-center shrink-0 group xl:me-2 2xl:me-6" aria-label={`${brandName(lang)} — ${t.tagline}`}>
          <span className="inline-block transition-transform duration-300 group-hover:scale-[1.03]"><BrandLogo className="h-10 sm:h-11" textClassName="text-2xl sm:text-[1.7rem]" alt="" priority /></span>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-full border border-gray-200/60">
          {navLinks.filter((l) => !l.mobileOnly).map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap px-2.5 2xl:px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-brand-600 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {t(link.label)}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="hidden xl:flex items-center gap-3">
          {/* Favorites */}
          <Link
            href="/favorites"
            aria-label={t.favorites}
            className={`relative grid h-10 w-10 place-items-center rounded-full transition ${
              pathname.startsWith('/favorites')
                ? 'bg-rose-50 text-rose-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className="h-5 w-5" />
            {totalFavorites > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-white select-none leading-none">
                {totalFavorites}
              </span>
            )}
          </Link>

          {/* Messages (logged-in) */}
          {user && (
            <Link
              href="/messages"
              aria-label={unreadMessages ? t('{n} message(s) non lu(s)', { n: unreadMessages }) : t('Messages')}
              className={`relative grid h-10 w-10 place-items-center rounded-full transition ${pathname.startsWith('/messages') ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                  {unreadMessages}
                </span>
              )}
            </Link>
          )}

          {/* Add Hotel Button: it leads to the owner sign-up, so visitors only (also leaves room for the menu) */}
          {!user && (
            <Link
              href="/register?role=owner"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand-500 px-4 2xl:px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 hover:shadow-md"
            >
              {t.suggestHotel}
            </Link>
          )}

          {/* User Account: menu with the account's spaces (traveller, host, seller, investor) */}
          {user ? (
            <AccountMenu />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <User className="h-4 w-4 text-brand-500" />
              {t.login}
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={signOut}
              aria-label={t('Déconnexion')}
              title={t('Déconnexion')}
              className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {/* Language Switcher Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <Globe className="h-3.5 w-3.5 text-brand-500" />
              {lang.toUpperCase()}
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {langOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded-2xl bg-white p-1.5 shadow-xl border border-gray-100 z-50">
                {[
                  { code: 'fr', label: 'Français' },
                  { code: 'ar', label: 'العربية' },
                  { code: 'en', label: 'English' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      changeLang(l.code);
                      setLangOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold text-left transition ${
                      lang === l.code
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t(l.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? t('Fermer le menu') : t('Ouvrir le menu')}
          aria-expanded={open}
          className="grid h-11 w-11 place-items-center rounded-xl text-gray-700 hover:bg-gray-100 xl:hidden"
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-6 xl:hidden space-y-3">
          {/* Mobile Language Switcher */}
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl justify-center">
            <Globe className="h-4 w-4 text-brand-500" />
            {['fr', 'ar', 'en'].map((code) => (
              <button
                key={code}
                onClick={() => changeLang(code)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  lang === code ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          {navLinks.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-4 py-3 font-bold text-base transition ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t(link.label)}
              </Link>
            );
          })}

          {user && (
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-bold text-gray-700 transition hover:bg-gray-50"
            >
              <span className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-brand-500" /> {t('Messages')}</span>
              {unreadMessages > 0 && <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">{unreadMessages}</span>}
            </Link>
          )}

          {/* Mobile Favorites Link */}
          <Link
            href="/favorites"
            onClick={() => setOpen(false)}
            className={`flex items-center justify-between rounded-xl px-4 py-3 font-bold text-base transition ${
              pathname.startsWith('/favorites') ? 'bg-rose-50 text-rose-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              {t.favorites}
            </span>
            {totalFavorites > 0 && (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {totalFavorites}
              </span>
            )}
          </Link>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
            {!user && (
              <Link
                href="/register?role=owner"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-brand-500 py-3 text-center text-sm font-bold text-white shadow-sm"
              >
                {t.suggestHotel}
              </Link>
            )}
            <Link
              href={user ? dashHref : '/login'}
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-center text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              {user && <Avatar user={user} className="h-7 w-7 rounded-full text-xs" initialClassName="bg-brand-500 text-white" />}
              {user ? t.mySpace : t.login}
            </Link>
            {user && <SpaceSwitcher onDone={() => setOpen(false)} />}
            {user && (
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> {t('Déconnexion')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
