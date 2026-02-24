'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const DISMISS_KEY = 'fitflow_tracking_widget_dismissed';

/**
 * Floating mobile widget for guest order tracking.
 *
 * - Only visible on mobile (hidden on md+ via CSS)
 * - Only visible when user is NOT authenticated
 * - Fades in after 2 seconds
 * - Dismissible (persisted in sessionStorage for current visit)
 * - Navigates to /order/track on click
 */
export default function OrderTrackingWidget() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Start dismissed to avoid flash

  useEffect(() => {
    // Check sessionStorage for dismissal
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      // sessionStorage unavailable — show the widget
    }

    setDismissed(false);

    // Fade in after 2 seconds
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Hide for authenticated users
  if (user) return null;

  // Hide if dismissed
  if (dismissed) return null;

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  }

  function handleClick() {
    router.push('/order/track');
  }

  return (
    <div
      className={`fixed bottom-20 right-4 z-40 md:hidden transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="relative">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-900 transition-colors shadow-md"
          aria-label="Затвори"
        >
          ×
        </button>

        {/* Main widget button */}
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-4 py-3 bg-[var(--color-brand-navy)] text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <svg className="w-5 h-5 text-[var(--color-brand-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-sm font-medium whitespace-nowrap">Проследи поръчка</span>
        </button>
      </div>
    </div>
  );
}
