'use client';

import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Bell, Sun, Moon, Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { getInitials } from '@/lib/utils';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
  unreadCount?: number;
}

export function Header({ onMenuClick, unreadCount = 0 }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const user = session?.user;
  const initials = user?.name ? getInitials(user.name) : 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="gap-1.5 text-xs font-medium"
        >
          <span className="text-base">{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
          {lang === 'en' ? 'العربية' : 'English'}
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </a>
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-white text-xs font-bold dark:bg-brand-accent dark:text-brand-navy">
              {initials}
            </div>
            <div className="hidden md:block text-start">
              <p className="text-sm font-medium leading-none">{user?.name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute end-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg">
                <a
                  href="/settings"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" />
                  {t('nav.settings')}
                </a>
                <hr className="my-1" />
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
