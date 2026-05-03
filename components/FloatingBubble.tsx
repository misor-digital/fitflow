'use client';

import { useState, useEffect } from 'react';

const POSITIONS = {
  'top-right': 'top-28 right-4',
  'bottom-right': 'bottom-6 right-4',
} as const;

interface FloatingBubbleProps {
  children: React.ReactNode;
  dismissKey: string;
  position?: keyof typeof POSITIONS;
  delayMs?: number;
  bgColor?: string;
  textColor?: string;
  onClick?: () => void;
  visible?: boolean;
  className?: string;
}

export default function FloatingBubble({
  children,
  dismissKey,
  position = 'top-right',
  delayMs = 2000,
  bgColor,
  textColor = 'white',
  onClick,
  visible: externalVisible = true,
  className = '',
}: FloatingBubbleProps) {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(dismissKey) === '1') return;
    } catch {
      // sessionStorage unavailable
    }

    const t1 = setTimeout(() => setDismissed(false), 0);
    const t2 = setTimeout(() => setShown(true), delayMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dismissKey, delayMs]);

  if (!externalVisible || dismissed) return null;

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setShown(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch {
      // Ignore
    }
  }

  const posClass = POSITIONS[position];
  const Tag = onClick ? 'button' : 'div';

  return (
    <div
      className={`fixed ${posClass} z-40 transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="relative">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-900 transition-colors shadow-md"
          aria-label="Затвори"
        >
          ×
        </button>

        <Tag
          {...(onClick ? { onClick } : {})}
          className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-full shadow-lg ${onClick ? 'hover:shadow-xl active:scale-95' : ''} transition-all ${className}`}
          style={{ backgroundColor: bgColor ?? 'var(--color-brand-navy)', color: textColor }}
        >
          {children}
        </Tag>
      </div>
    </div>
  );
}
