'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrderStore } from '@/store/orderStore';
import {
  trackLead,
  trackGenerateLead,
  setUserProperties,
} from '@/lib/analytics';

interface LastOrderInfo {
  orderNumber: string;
  orderId: string;
  email: string;
  isGuest: boolean;
  finalPriceEur?: number | null;
}

export default function OrderThankYou() {
  const router = useRouter();
  const hasTracked = useRef(false);
  const orderInfoRef = useRef<LastOrderInfo | null>(null);
  const [orderInfo, setOrderInfo] = useState<LastOrderInfo | null>(null);

  // Read order info from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fitflow-last-order');
      if (!raw) {
        router.replace('/order');
        return;
      }
      const info: LastOrderInfo = JSON.parse(raw);
      if (!info.orderNumber) {
        router.replace('/order');
        return;
      }
      orderInfoRef.current = info;
      // Batch via queueMicrotask to avoid synchronous setState-in-effect
      queueMicrotask(() => setOrderInfo(info));
    } catch {
      router.replace('/order');
    }
  }, [router]);

  // Track conversion events once
  useEffect(() => {
    if (!orderInfo || hasTracked.current) return;

    // Meta Pixel — Lead event (purchase tracking can be added when payments are live)
    trackLead();

    // GA4 — generate_lead event
    trackGenerateLead({
      currency: 'EUR',
      value: orderInfo.finalPriceEur ?? 0,
    });

    // GA4 — user properties
    setUserProperties({
      promo_code_used: false, // order completed
    });

    hasTracked.current = true;
  }, [orderInfo]);

  const handleGoHome = () => {
    // Clean up order state
    useOrderStore.getState().reset();
    sessionStorage.removeItem('fitflow-last-order');
    router.push('/');
  };

  // Loading state
  if (!orderInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-orange)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white flex items-center justify-center p-3 sm:p-5">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-5 sm:mb-6 md:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-green-100 rounded-full flex items-center justify-center animate-[scaleIn_0.5s_ease-out]">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Logo */}
          <div className="text-2xl sm:text-3xl font-extrabold text-[#023047] italic mb-4 sm:mb-5 md:mb-6">
            FitFlow
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#023047] mb-3 sm:mb-4">
            Благодарим за поръчката!
          </h1>

          {/* Order number */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 sm:mb-5">
            <p className="text-sm text-gray-500 mb-1">Номер на поръчка</p>
            <p className="text-lg sm:text-xl font-bold text-[#023047] font-mono">
              {orderInfo.orderNumber}
            </p>
          </div>

          {/* Email confirmation */}
          {orderInfo.email && (
            <p className="text-gray-600 text-base sm:text-lg mb-4 sm:mb-5 leading-relaxed">
              Изпратихме потвърждение на{' '}
              <span className="font-semibold text-[#023047]">
                {orderInfo.email}
              </span>
            </p>
          )}

          {/* Guest vs Authenticated messaging */}
          {orderInfo.isGuest ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 sm:mb-6 text-left">
              <p className="text-sm text-amber-800 font-medium mb-1">
                📋 Запазете номера на поръчката!
              </p>
              <p className="text-sm text-amber-700">
                Можете да проследите поръчката си{' '}
                <Link
                  href={`/order/track?order=${encodeURIComponent(orderInfo.orderNumber)}`}
                  className="text-[var(--color-brand-orange)] hover:underline font-semibold"
                >
                  тук
                </Link>
                .
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-base mb-5 sm:mb-6 leading-relaxed">
              Можете да видите поръчката си в{' '}
              <Link
                href="/account"
                className="text-[var(--color-brand-orange)] hover:underline font-semibold"
              >
                акаунта
              </Link>
              .
            </p>
          )}

          {/* Divider */}
          <div className="w-12 sm:w-16 h-1 bg-[#FB7D00] mx-auto mb-5 sm:mb-6 md:mb-8 rounded" />

          {/* Contact info */}
          <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 mb-5 sm:mb-6 md:mb-8">
            <p className="text-sm sm:text-base text-[#023047] font-medium">
              Имаш въпроси? Свържи се с нас на{' '}
              <a
                href="mailto:info@fitflow.bg"
                className="text-[#FB7D00] hover:underline font-semibold"
              >
                info@fitflow.bg
              </a>
            </p>
          </div>

          {/* Go home button */}
          <button
            onClick={handleGoHome}
            className="w-full bg-[#FB7D00] text-white py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Към начална страница
          </button>
        </div>
      </div>
    </div>
  );
}
