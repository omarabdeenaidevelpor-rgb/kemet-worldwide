'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard, Users, Package, MapPin, DollarSign,
  AlertTriangle, FileText, BarChart3, Bell, UserCog,
  ClipboardList, Settings, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { hasPermission, type PermissionModule } from '@/lib/permissions';

const navItems = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'nav.customers', href: '/customers', icon: Users },
  { key: 'nav.shipments', href: '/shipments', icon: Package },
  { key: 'nav.tracking', href: '/tracking', icon: MapPin },
  {
    key: 'nav.finance', icon: DollarSign, children: [
      { key: 'nav.invoices', href: '/finance/invoices' },
      { key: 'nav.payments', href: '/finance/payments' },
      { key: 'nav.expenses', href: '/finance/expenses' },
    ]
  },
  { key: 'nav.incidents', href: '/incidents', icon: AlertTriangle },
  { key: 'nav.documents', href: '/documents', icon: FileText },
  { key: 'nav.reports', href: '/reports', icon: BarChart3 },
  { key: 'nav.notifications', href: '/notifications', icon: Bell },
  { key: 'nav.employees', href: '/employees', icon: UserCog },
  { key: 'nav.audit', href: '/audit', icon: ClipboardList },
  { key: 'nav.settings', href: '/settings', icon: Settings },
];

interface SidebarProps { onClose?: () => void; }

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, dir } = useLanguage();
  const [openGroup, setOpenGroup] = useState<string | null>('/finance');
  const permissionModules: Record<string, PermissionModule | undefined> = {
    'nav.dashboard': 'DASHBOARD',
    'nav.customers': 'CUSTOMERS',
    'nav.shipments': 'SHIPMENTS',
    'nav.tracking': 'TRACKING',
    'nav.finance': 'FINANCE',
    'nav.incidents': 'INCIDENTS',
    'nav.documents': 'DOCUMENTS',
    'nav.reports': 'REPORTS',
    'nav.employees': 'EMPLOYEES',
    'nav.audit': 'AUDIT',
    'nav.settings': 'SETTINGS',
  };
  const visibleNavItems = navItems.filter((item) => {
    const navModule = permissionModules[item.key];
    return !navModule || hasPermission(session?.user.permissions, session?.user.roles, navModule, 'VIEW');
  });

  React.useEffect(() => {
    if (pathname.startsWith('/finance')) setOpenGroup('/finance');
  }, [pathname]);

  return (
    <aside
      className="flex h-full w-64 flex-col bg-brand-navy text-white"
      dir={dir}
    >
      <Link
        href="/dashboard"
        className="flex h-16 items-center border-b border-white/10 px-5 transition-opacity hover:opacity-90"
        aria-label="KEMET Worldwide — Dashboard"
      >
        <BrandLogo variant="white" priority className="h-9" />
      </Link>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-hide">
        {visibleNavItems.map((item) => {
          if (item.children) {
            const isOpen = openGroup === '/finance';
            const isActive = pathname.startsWith('/finance');
            const Icon = item.icon;
            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : '/finance')}
                  className={cn(
                    'sidebar-item w-full',
                    isActive ? 'text-brand-accent' : 'text-white/70'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-start">{t(item.key)}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="ms-7 mt-0.5 space-y-0.5 border-s border-white/10 ps-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          'block rounded-md px-3 py-2 text-xs font-medium transition-colors',
                          pathname === child.href
                            ? 'bg-brand-accent/20 text-brand-accent'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {t(child.key)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = item.href
            ? item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            : false;

          return (
            <Link
              key={item.key}
              href={item.href!}
              onClick={onClose}
              className={cn(
                'sidebar-item',
                isActive ? 'active' : 'text-white/70'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-center text-[10px] text-white/30">
          © 2026 KemetWorldwide Co.
        </p>
      </div>
    </aside>
  );
}
