/**
 * Customer Account Dashboard
 * URL: /account
 * 
 * Main customer portal page - shows overview and quick links
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardData {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  profile: {
    fullName: string;
  } | null;
  stats: {
    preordersCount: number;
  };
}

export default function AccountDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch('/api/account/dashboard');
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/account/login');
            return;
          }
          throw new Error('Failed to load dashboard');
        }

        setData(result.data);
        setLoading(false);
      } catch {
        router.push('/account/login');
      }
    }

    loadDashboard();
  }, [router]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Моят профил</h1>
              <p className="mt-2 text-blue-100">
                Добре дошли, {data.profile?.fullName || data.user.email}!
              </p>
            </div>
            <Link
              href="/"
              className="text-blue-100 hover:text-white transition"
            >
              ← Начало
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Поръчки</p>
                <p className="text-2xl font-bold text-gray-900">{data.stats.preordersCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Статус</p>
                <p className="text-lg font-semibold text-gray-900">Активен</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Имейл</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{data.user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Orders */}
          <Link
            href="/account/preorders"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  Моите поръчки
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Преглед на всички ваши поръчки и техния статус
                </p>
              </div>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* My Profile */}
          <Link
            href="/account/profile"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  Моят профил
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Управление на лична информация и настройки
                </p>
              </div>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <form action="/api/account/logout" method="POST">
            <button
              type="submit"
              className="text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Излез от профила
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
