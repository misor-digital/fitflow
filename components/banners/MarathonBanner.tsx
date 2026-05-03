'use client';

import { usePathname } from 'next/navigation';
import SlidingBanner from '@/components/SlidingBanner';

/**
 * Charity marathon banner — shown only during May 2026.
 * "10% from every order in May goes to the UACEG students' marathon cause."
 */
export function MarathonBanner() {
  const pathname = usePathname();

  // Hide on thank-you and admin pages
  if (pathname === '/order/thank-you') return null;
  if (pathname?.startsWith('/admin')) return null;

  // Show only during May 2026
  const now = new Date();
  if (now.getFullYear() !== 2026 || now.getMonth() !== 4) return null;

  return (
    <SlidingBanner
      emoji="🏅"
      text='10% от всяка поръчка през май отиват за каузата на "Студентите бягат с УАСГ" в подкрепа на онкоболни студенти. Поръчай кутия - подкрепи каузата.'
      linkHref="https://uacegstudentsrun.com/"
      linkLabel="Научи повече"
      bgColor="rgb(166, 51, 55)"
      textColor="#ffffff"
    />
  );
}
