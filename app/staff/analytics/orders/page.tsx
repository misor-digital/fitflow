/**
 * Order Analytics Dashboard
 * Display order metrics and customer insights
 * URL: /staff/analytics/orders
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  fulfilledOrders: number;
  cancelledOrders: number;
  conversionRate: number;
}

interface TopProduct {
  productName: string;
  orders: number;
  revenue: number;
}

interface CustomerLifetimeValue {
  averageCLV: number;
  topCustomers: Array<{
    email: string;
    orderCount: number;
    totalSpent: number;
  }>;
}

export default function OrderAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [clvData, setClvData] = useState<CustomerLifetimeValue | null>(null);
  const [error, setError] = useState('');

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Load order stats
      const statsResponse = await fetch('/api/staff/analytics/orders?type=stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!statsResponse.ok) {
        if (statsResponse.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load order stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData.stats);

      // Load top products
      const productsResponse = await fetch('/api/staff/analytics/orders?type=top-products&limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setTopProducts(productsData.products);
      }

      // Load CLV data
      const clvResponse = await fetch('/api/staff/analytics/orders?type=clv', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (clvResponse.ok) {
        const clvResponseData = await clvResponse.json();
        setClvData(clvResponseData.clv);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Грешка при зареждане на данните');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
                <span className="text-gray-600">Анализ на поръчките</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Анализ на поръчките</h1>
              <p className="text-sm text-gray-600">Преглед на поръчките и клиентите</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/staff/analytics/revenue"
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm"
              >
                💰 Анализ на приходите
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

        {/* Order Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Total Orders */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow p-6 text-white">
              <p className="text-sm opacity-90 mb-2">Общо поръчки</p>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
            </div>

            {/* Pending Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Чакащи</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
              <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                Pending
              </span>
            </div>

            {/* Fulfilled Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Изпълнени</p>
              <p className="text-3xl font-bold text-green-600">{stats.fulfilledOrders}</p>
              <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Fulfilled
              </span>
            </div>

            {/* Cancelled Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Отказани</p>
              <p className="text-3xl font-bold text-red-600">{stats.cancelledOrders}</p>
              <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                Cancelled
              </span>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Конверсия</p>
              <p className="text-3xl font-bold text-blue-600">{stats.conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-2">
                Изпълнени / Общо
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Топ продукти</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Продукт
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Поръчки
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Приходи
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topProducts.map((product, index) => (
                      <tr key={index} className={index < 3 ? 'bg-purple-50' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {index < 3 && (
                            <span className="inline-block w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center mr-2">
                              {index + 1}
                            </span>
                          )}
                          {product.productName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {product.orders}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-purple-600">
                          {product.revenue.toFixed(2)} лв.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Lifetime Value */}
          {clvData && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Стойност на клиента (CLV)</h2>
              
              {/* Average CLV */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                <p className="text-sm text-purple-800 mb-1">Средна CLV</p>
                <p className="text-3xl font-bold text-purple-900">
                  {clvData.averageCLV.toFixed(2)} лв.
                </p>
              </div>

              {/* Top Customers */}
              {clvData.topCustomers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Топ клиенти</h3>
                  <div className="space-y-3">
                    {clvData.topCustomers.map((customer, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {customer.email}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {customer.orderCount} {customer.orderCount === 1 ? 'поръчка' : 'поръчки'}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-sm font-bold text-purple-600">
                              {customer.totalSpent.toFixed(2)} лв.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        {stats && stats.totalOrders > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Разпределение на поръчките</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-yellow-600">
                        Чакащи
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-yellow-600">
                        {((stats.pendingOrders / stats.totalOrders) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-yellow-200">
                    <div
                      style={{ width: `${(stats.pendingOrders / stats.totalOrders) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"
                    ></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-green-600">
                        Изпълнени
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-green-600">
                        {((stats.fulfilledOrders / stats.totalOrders) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
                    <div
                      style={{ width: `${(stats.fulfilledOrders / stats.totalOrders) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                    ></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-red-600">
                        Отказани
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-red-600">
                        {((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-red-200">
                    <div
                      style={{ width: `${(stats.cancelledOrders / stats.totalOrders) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {stats && stats.totalOrders === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Все още няма поръчки</p>
          </div>
        )}
      </main>
    </div>
  );
}
