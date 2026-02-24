'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { StaffRole } from '@/lib/supabase/types';

interface Props {
  userName: string;
  userRole: StaffRole;
}

/** Sidebar navigation items with role-based visibility */
const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: string;
  allowedRoles: StaffRole[] | 'all';
}> = [
  { href: '/admin', label: 'Табло', icon: '📊', allowedRoles: 'all' },
  { href: '/admin/orders', label: 'Поръчки', icon: '📦',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/subscriptions', label: 'Абонаменти', icon: '🔄',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/delivery', label: 'Доставки', icon: '📅',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/staff', label: 'Служители', icon: '👥',
    allowedRoles: ['super_admin', 'admin'] },
  { href: '/admin/promo', label: 'Промо кодове', icon: '🏷️',
    allowedRoles: ['super_admin', 'admin', 'marketing'] },
  { href: '/admin/emails', label: 'Имейли', icon: '📊',
    allowedRoles: ['super_admin', 'admin', 'content', 'marketing'] },
  { href: '/admin/campaigns', label: 'Кампании', icon: '📧',
    allowedRoles: ['super_admin', 'admin', 'content', 'marketing'] },
  { href: '/admin/content', label: 'Съдържание', icon: '📝',
    allowedRoles: ['super_admin', 'admin', 'content'] },
  { href: '/admin/analytics', label: 'Анализи', icon: '📈',
    allowedRoles: ['super_admin', 'admin', 'analyst', 'marketing'] },
  { href: '/admin/settings', label: 'Настройки', icon: '⚙️',
    allowedRoles: ['super_admin', 'admin'] },
];

export default function AdminSidebar({ userName, userRole }: Props) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    item => item.allowedRoles === 'all' || item.allowedRoles.includes(userRole)
  );

  return (
    <aside className="w-64 bg-[var(--color-brand-navy)] text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="text-2xl font-extrabold italic hover:text-[var(--color-brand-orange)] transition-colors">
          FitFlow
        </Link>
        <p className="text-xs text-white/60 mt-1">Админ панел</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {visibleItems.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-[var(--color-brand-orange)] font-semibold'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-6 border-t border-white/10">
        <p className="text-sm font-medium truncate">{userName}</p>
        <p className="text-xs text-white/60 capitalize">{userRole.replace('_', ' ')}</p>
        <Link
          href="/"
          className="text-xs text-[var(--color-brand-orange)] hover:underline mt-2 inline-block"
        >
          ← Към сайта
        </Link>
      </div>
    </aside>
  );
}
