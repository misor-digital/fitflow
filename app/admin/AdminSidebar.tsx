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
  children?: Array<{
    href: string;
    label: string;
    icon: string;
    allowedRoles: StaffRole[] | 'all';
  }>;
}> = [
  { href: '/admin', label: 'Табло', icon: '📊', allowedRoles: 'all' },
  { href: '/admin/orders', label: 'Поръчки', icon: '📦',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/subscriptions', label: 'Абонаменти', icon: '🔄',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/customers', label: 'Клиенти', icon: '👥',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/delivery', label: 'Доставки', icon: '📅',
    allowedRoles: ['super_admin', 'admin', 'manager', 'support', 'warehouse'] },
  { href: '/admin/dispatch', label: 'Изпращане', icon: '🚚',
    allowedRoles: ['super_admin', 'admin', 'manager'] },
  { href: '/admin/staff', label: 'Служители', icon: '👥',
    allowedRoles: ['super_admin', 'admin'] },
  {
    href: '/admin/campaigns', label: 'Маркетинг', icon: '📣',
    allowedRoles: ['super_admin', 'admin', 'marketing'],
    children: [
      { href: '/admin/campaigns', label: 'Кампании', icon: '📧',
        allowedRoles: ['super_admin', 'admin', 'content', 'marketing'] },
      { href: '/admin/order-subscription-campaign', label: 'Конвертиране в абонаменти', icon: '🔀',
        allowedRoles: ['super_admin', 'admin', 'marketing'] },
      { href: '/admin/preorder-campaign', label: 'Предварителни поръчки', icon: '🛒',
        allowedRoles: ['super_admin', 'admin', 'marketing'] },
      { href: '/admin/promo', label: 'Промо кодове', icon: '🏷️',
        allowedRoles: ['super_admin', 'admin', 'marketing'] },
    ],
  },
  {
    href: '/admin/emails', label: 'Имейли', icon: '✉️',
    allowedRoles: ['super_admin', 'admin', 'content', 'marketing'],
    children: [
      { href: '/admin/emails', label: 'Табло', icon: '📊',
        allowedRoles: ['super_admin', 'admin', 'content', 'marketing'] },
      { href: '/admin/emails/contacts', label: 'Контакти', icon: '👤',
        allowedRoles: ['super_admin', 'admin', 'marketing'] },
      { href: '/admin/emails/unsubscribes', label: 'Отписани', icon: '🚫',
        allowedRoles: ['super_admin', 'admin', 'marketing'] },
      { href: '/admin/emails/preview', label: 'Преглед на шаблони', icon: '👁️',
        allowedRoles: ['super_admin', 'admin', 'marketing', 'content'] },
    ],
  },
  { href: '/admin/content', label: 'Съдържание', icon: '📝',
    allowedRoles: ['super_admin', 'admin', 'content'] },
  { href: '/admin/analytics', label: 'Анализи', icon: '📈',
    allowedRoles: ['super_admin', 'admin', 'analyst', 'marketing'] },
  { href: '/admin/feedback', label: 'Обратна връзка', icon: '💬',
    allowedRoles: ['super_admin', 'admin', 'marketing', 'content', 'support'] },
  {
    href: '/admin/settings', label: 'Настройки', icon: '⚙️',
    allowedRoles: ['super_admin', 'admin'],
    children: [
      { href: '/admin/settings', label: 'Общи', icon: '⚙️',
        allowedRoles: ['super_admin', 'admin'] },
      { href: '/admin/settings/delivery', label: 'Доставки', icon: '📅',
        allowedRoles: ['super_admin', 'admin'] },
      { href: '/admin/settings/dispatch', label: 'Изпращане (Speedy)', icon: '🚚',
        allowedRoles: ['super_admin', 'admin'] },
      { href: '/admin/speedy', label: 'Speedy API', icon: '🔌',
        allowedRoles: ['super_admin', 'admin'] },
    ],
  },
  { href: '/admin/docs', label: 'Документация', icon: '📖',
    allowedRoles: 'all' },
];

export default function AdminSidebar({ userName, userRole }: Props) {
  const pathname = usePathname();

  const isAllowed = (allowedRoles: StaffRole[] | 'all') =>
    allowedRoles === 'all' || allowedRoles.includes(userRole);

  const visibleItems = NAV_ITEMS.filter(item => isAllowed(item.allowedRoles));

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
          const hasChildren = item.children && item.children.length > 0;
          const isGroupExpanded = hasChildren && (
            pathname.startsWith(item.href) ||
            item.children!.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))
          );

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-[var(--color-brand-orange)] font-semibold'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <span className="text-white/40 text-xs">{isGroupExpanded ? '▾' : '▸'}</span>
                )}
              </Link>

              {/* Sub-menu — always visible when parent path is active */}
              {hasChildren && isGroupExpanded && (
                <div className="border-l border-white/10 ml-6">
                  {item.children!
                    .filter(child => isAllowed(child.allowedRoles))
                    .map(child => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2 pl-4 pr-6 py-2.5 text-sm transition-colors ${
                            childActive
                              ? 'text-[var(--color-brand-orange)] font-semibold'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs">{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
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
