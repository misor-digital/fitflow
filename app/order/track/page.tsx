'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ORDER_STATUS_COLORS, STATUS_BG_COLORS, formatShippingAddress } from '@/lib/order';
import type { OrderStatus, ShippingAddressSnapshot } from '@/lib/supabase/types';
import { formatPriceDual } from '@/lib/catalog';
import { StatusTimeline } from '@/components/account/StatusTimeline';
import type { StatusHistoryEntry } from '@/components/account/StatusTimeline';

// ============================================================================
// Types
// ============================================================================

interface TrackingOrder {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  customerFullName: string;
  boxType: string;
  boxTypeName: string;
  shippingAddress: ShippingAddressSnapshot;
  deliveryMethod: 'address' | 'speedy_office';
  finalPriceEur: number | null;
  finalPriceBgn: number | null;
  createdAt: string;
  statusHistory: StatusHistoryEntry[];
}

// ============================================================================
// Inner component that uses useSearchParams
// ============================================================================

function OrderTrackingContent() {
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  // Pre-fill order number from URL param (email NEVER pre-filled)
  useEffect(() => {
    const orderParam = searchParams.get('order');
    if (orderParam) {
      setOrderNumber(orderParam);
    }
  }, [searchParams]);

  function resetSearch() {
    setOrder(null);
    setError(null);
    setRateLimited(false);
    setEmail('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRateLimited(false);

    // Client-side validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOrder = orderNumber.trim().toUpperCase();

    if (!trimmedEmail || !trimmedOrder) {
      setError('Моля, попълнете и двете полета.');
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Моля, въведете валиден имейл адрес.');
      return;
    }

    // Order number format hint
    if (!trimmedOrder.startsWith('FF-')) {
      setError('Номерът на поръчката трябва да започва с "FF-".');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        email: trimmedEmail,
        order: trimmedOrder,
      });

      const res = await fetch(`/api/order/track?${params.toString()}`);
      const data = await res.json();

      if (res.status === 429) {
        setRateLimited(true);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Възникна грешка. Моля, опитайте отново.');
        return;
      }

      setOrder(data.order);
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.');
    } finally {
      setLoading(false);
    }
  }

  // ── Rate Limited State ──────────────────────────────────────────────────
  if (rateLimited) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-8">
          <svg className="w-12 h-12 text-orange-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Твърде много опити</h2>
          <p className="text-gray-600 mb-6">Моля, опитайте след 15 минути.</p>
          <button
            onClick={() => setRateLimited(false)}
            className="text-[var(--color-brand-orange)] hover:underline font-medium"
          >
            Опитай отново
          </button>
        </div>
      </div>
    );
  }

  // ── Order Details State ─────────────────────────────────────────────────
  if (order) {
    const addressLines = formatShippingAddress(order.shippingAddress).split('\n');

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Status Badge */}
        <div className="text-center mb-8">
          <span
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-lg font-bold ${STATUS_BG_COLORS[order.status]} ${ORDER_STATUS_COLORS[order.status]}`}
          >
            {order.status === 'delivered' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {order.statusLabel}
          </span>
        </div>

        {/* Order Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Детайли на поръчката</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 mb-1">Номер на поръчка</dt>
              <dd className="font-semibold text-gray-900">{order.orderNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">Клиент</dt>
              <dd className="font-semibold text-gray-900">{order.customerFullName}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">Тип кутия</dt>
              <dd className="font-semibold text-gray-900">{order.boxTypeName}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">Цена</dt>
              <dd className="font-semibold text-[var(--color-brand-orange)]">
                {order.finalPriceEur != null && order.finalPriceBgn != null
                  ? formatPriceDual(order.finalPriceEur, order.finalPriceBgn)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">Дата</dt>
              <dd className="font-semibold text-gray-900">
                {new Date(order.createdAt).toLocaleDateString('bg-BG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Shipping Address Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Адрес за доставка</h2>
          {order.deliveryMethod === 'speedy_office' && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
                📦 До офис на Speedy
              </span>
            </div>
          )}
          <div className="text-sm text-gray-700 space-y-1">
            {addressLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Хронология</h2>
          <StatusTimeline
            statusHistory={order.statusHistory}
            currentStatus={order.status}
          />
        </div>

        {/* Search Again */}
        <div className="text-center">
          <button
            onClick={resetSearch}
            className="px-6 py-3 bg-[var(--color-brand-navy)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Търси друга поръчка
          </button>
        </div>
      </div>
    );
  }

  // ── Search Form (initial state) ────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Проследяване на поръчка
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Въведете номера на поръчката и имейл адреса, с който сте поръчали.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Номер на поръчка
          </label>
          <input
            id="orderNumber"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="FF-XXXXXX-XXXXXX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent outline-none text-sm"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Имейл адрес
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent outline-none text-sm"
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--color-brand-orange)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Търсене...
            </>
          ) : (
            'Проследи'
          )}
        </button>
      </form>

      {/* Helpful links */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Нямате акаунт?{' '}
          <Link href="/register" className="text-[var(--color-brand-orange)] hover:underline">
            Регистрирайте се
          </Link>{' '}
          за да следите поръчките си по-лесно.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Page wrapper with Suspense (required for useSearchParams)
// ============================================================================

export default function OrderTrackPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 pt-20">
        <Suspense
          fallback={
            <div className="max-w-lg mx-auto py-12 px-4 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-[var(--color-brand-orange)] border-t-transparent rounded-full mx-auto" />
            </div>
          }
        >
          <OrderTrackingContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
