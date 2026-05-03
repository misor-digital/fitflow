'use client';

import { usePathname } from 'next/navigation';
import FloatingBubble from '@/components/FloatingBubble';

/**
 * Floating donation info bubble — shown during May 2026 campaign.
 * Informational only (no link). Dismissible per session.
 */
export function DonationBubble() {
  const pathname = usePathname();

  // Hide on admin pages
  if (pathname?.startsWith('/admin')) return null;

  // Show only during May 2026
  const now = new Date();
  if (now.getFullYear() !== 2026 || now.getMonth() !== 4) return null;

  return (
    <FloatingBubble
      dismissKey="fitflow_donation_bubble_dismissed"
      position="top-right"
      bgColor="rgb(166, 51, 55)"
      textColor="#ffffff"
    >
      <span className="text-sm md:text-base font-medium whitespace-nowrap">🏅 10% за дарение</span>
    </FloatingBubble>
  );
}
