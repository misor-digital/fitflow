'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/account', label: 'Профил' },
  { href: '/account/edit', label: 'Редактиране' },
  { href: '/account/security', label: 'Сигурност' },
  { href: '/account/subscriptions', label: 'Абонаменти' },
] as const;

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 mb-8 border-b pb-4">
      {tabs.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium pb-1 transition-colors ${
              isActive
                ? 'text-[var(--color-brand-orange)] border-b-2 border-[var(--color-brand-orange)]'
                : 'text-gray-500 hover:text-[var(--color-brand-navy)]'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
