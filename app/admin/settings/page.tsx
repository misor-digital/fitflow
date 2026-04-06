import { requireStaff } from '@/lib/auth';
import { AdminHelpLink } from '@/components/admin/AdminHelpLink';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Настройки | Администрация | FitFlow',
};

const settingsLinks = [
  {
    href: '/admin/settings/delivery',
    label: 'Доставки',
    description: 'Ден на доставка, дати, функционалности',
    icon: '📅',
  },
  // Future: more settings categories
];

export default async function SettingsPage() {
  await requireStaff(['super_admin', 'admin']);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          Настройки
        </h1>
        <AdminHelpLink section="settings" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[var(--color-brand-orange)] hover:shadow-md transition-all group"
          >
            <span className="text-3xl mb-3 block">{link.icon}</span>
            <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] group-hover:text-[var(--color-brand-orange)] transition-colors">
              {link.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
