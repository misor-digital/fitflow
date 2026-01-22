/**
 * Revenue Analytics Dashboard
 * Display revenue metrics and breakdowns
 * URL: /staff/analytics/revenue
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  growthRate: number;
  periodData: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

interface BoxTypeRevenue {
  boxTypeName: string;
  totalRevenue: number;
  orderCount: number;
}

interface PromoCodeUsage {
  code: string;
  usageCount: number;
  totalDiscount: number;
}

export default function RevenueAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [boxTypeRevenue, setBoxTypeRevenue] = useState<BoxTypeRevenue[]>([]);
  const [promoUsage, setPromoUsage] = useState<PromoCodeUsage[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Build query params
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      // Load revenue metrics
      const revenueResponse = await fetch(`/api/staff/analytics/revenue?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!revenueResponse.ok) {
        if (revenueResponse.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load revenue data');
      }

      const revenueData = await revenueResponse.json();
      setMetrics(revenueData.metrics);

      // Load box type revenue
      const boxTypeResponse = await fetch('/api/staff/analytics/revenue/box-types', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (boxTypeResponse.ok) {
        const boxTypeData = await boxTypeResponse.json();
        setBoxTypeRevenue(boxTypeData.boxTypes);
      }

      // Load promo code usage
      const promoResponse = await fetch('/api/staff/analytics/promo-codes', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (promoResponse.ok) {
        const promoData = await promoResponse.json();
        setPromoUsage(promoData.promoCodes);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Грешка при зареждане на данните');
      setLoading(false);
    }
  }, [router, fromDate, toDate]);

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      checkAuthAndLoadData();
    }
  }, [checkAuthAndLoadData, fromDate, toDate]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkAuthAndLoadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800">
                  Табло
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">Анализ на приходите</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Анализ на приходите</h1>
              <p className="text-sm text-gray-600">Преглед на приходите и продажбите</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/staff/analytics/orders"
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm"
              >
                📊 Анализ на поръчките
              </Link>
              <Link
                href="/staff/promo-codes"
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm"
              >
                🎟️ Промо кодове
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-2">
                От дата
              </label>
              <input
                type="date"
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-2">
                До дата
              </label>
              <input
                type="date"
                id="toDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
            >
              Приложи филтър
            </button>
          </form>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow p-6 text-white">
              <p className="text-sm opacity-90 mb-2">Общи приходи</p>
              <p className="text-3xl font-bold">{metrics.totalRevenue.toFixed(2)} лв.</p>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Средна стойност на поръчка</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.averageOrderValue.toFixed(2)} лв.</p>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Общо поръчки</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalOrders}</p>
            </div>

            {/* Growth Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Темп на растеж</p>
              <div className="flex items-center">
                <p className={`text-3xl font-bold ${metrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
                </p>
                <span className="ml-2 text-2xl">
                  {metrics.growthRate >= 0 ? '↑' : '↓'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Revenue by Period */}
        {metrics && metrics.periodData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Приходи по период</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Приходи
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Поръчки
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.periodData.map((period, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(period.date).toLocaleDateString('bg-BG')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {period.revenue.toFixed(2)} лв.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {period.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue by Box Type */}
        {boxTypeRevenue.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Приходи по тип кутия</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип кутия
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Общи приходи
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Брой поръчки
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {boxTypeRevenue.map((boxType, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {boxType.boxTypeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {boxType.totalRevenue.toFixed(2)} лв.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {boxType.orderCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Promo Code Usage */}
        {promoUsage.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Използване на промо кодове</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Код
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Използвания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Обща отстъпка
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {promoUsage.map((promo, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {promo.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {promo.usageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        -{promo.totalDiscount.toFixed(2)} лв.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {metrics && metrics.totalOrders === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Няма данни за избрания период</p>
          </div>
        )}
      </main>
    </div>
  );
}
