'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (20×20, stroke-based)                            */
/* ------------------------------------------------------------------ */

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

function UserIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg {...iconProps}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg {...iconProps}>
      <path d="m17 1 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg {...iconProps}>
      <path d="m16.5 9.4-9-5.19" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation structure                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Акаунт',
    items: [
      { href: '/account', label: 'Профил', icon: <UserIcon /> },
      { href: '/account/edit', label: 'Редактиране', icon: <PencilIcon /> },
      { href: '/account/security', label: 'Сигурност', icon: <ShieldIcon /> },
    ],
  },
  {
    title: 'Поръчки и абонаменти',
    items: [
      {
        href: '/account/subscriptions',
        label: 'Абонаменти',
        icon: <RepeatIcon />,
      },
      { href: '/account/orders', label: 'Поръчки', icon: <PackageIcon /> },
    ],
  },
];

const allItems = sections.flatMap((s) => s.items);

/* ------------------------------------------------------------------ */
/*  Active-state helper                                               */
/* ------------------------------------------------------------------ */

function isItemActive(href: string, pathname: string): boolean {
  // Exact match for profile root, prefix match for everything else
  return href === '/account'
    ? pathname === '/account'
    : pathname.startsWith(href);
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex flex-col w-56 shrink-0" aria-label="Акаунт навигация">
        {sections.map((section, idx) => (
          <div key={section.title}>
            <h3
              className={`text-xs uppercase tracking-wide font-semibold text-gray-400 mb-2 ${
                idx === 0 ? 'mt-0' : 'mt-6'
              }`}
            >
              {section.title}
            </h3>

            <ul className="flex flex-col gap-1">
              {section.items.map(({ href, label, icon }) => {
                const active = isItemActive(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2 ${
                        active
                          ? 'bg-orange-50 text-[var(--color-brand-orange)] border-l-[3px] border-[var(--color-brand-orange)] pl-[9px]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--color-brand-navy)]'
                      }`}
                    >
                      {icon}
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Mobile horizontal strip ── */}
      <nav
        className="flex md:hidden overflow-x-auto gap-1 snap-x snap-mandatory border-b pb-2 mb-6"
        aria-label="Акаунт навигация"
      >
        {allItems.map(({ href, label, icon }) => {
          const active = isItemActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-3 py-2 min-w-[4.5rem] snap-start rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2 ${
                active
                  ? 'bg-orange-50 text-[var(--color-brand-orange)]'
                  : 'text-gray-500 hover:text-[var(--color-brand-navy)]'
              }`}
            >
              {icon}
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
