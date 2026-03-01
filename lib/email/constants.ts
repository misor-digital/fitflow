import { BRAND } from '@/lib/constants/colors';

/**
 * Single source of truth for all email design tokens.
 *
 * Every email template imports from this file — no hardcoded
 * colors, fonts, sizes, or brand copy anywhere else.
 */
export const EMAIL = {
  colors: {
    ctaButton: BRAND.orange,
    ctaButtonDark: BRAND.orangeDark,
    headerGradient: `linear-gradient(135deg, ${BRAND.orangeDark} 0%, ${BRAND.orange} 100%)`,
    linkColor: BRAND.orange,

    background: '#f6f3f0',
    containerBg: '#ffffff',
    footerBg: '#fdf6f1',

    textPrimary: '#4a5568',
    textHeading: '#363636',
    textFooter: '#7a4a2a',
    textFooterSecondary: '#b08968',
    textMuted: '#6b7280',
    textMutedAlt: '#6c757d',
  },

  sections: {
    personalization: '#fff4ec',
    delivery: '#f0f7ff',
    promoBg: '#d4edda',
    promoBorder: '#c3e6cb',
    promoText: '#155724',
    freeDeliveryBg: '#e8f5e9',
    freeDeliveryBorder: '#4caf50',
    freeDeliveryText: '#2e7d32',
  },

  typography: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  layout: {
    maxWidth: '600px',
    borderRadius: '12px',
    containerShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },

  brand: {
    name: 'FitFlow',
    tagline: 'Защото можем',
    contactEmail: 'info@fitflow.bg',
    footerSignOff: 'С любов към спорта,',
    footerTeam: 'Екипът на FitFlow',
  },
} as const;
