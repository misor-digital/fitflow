/**
 * Customer Preorders Page
 * URL: /account/preorders
 * 
 * View and manage customer preorders
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Preorder {
  id: string;
  order_id: string;
  full_name: string;
  email: string;
  box_type: string;
  wants_personalization: boolean;
  created_at: string;
}

export default function CustomerPreordersPage() {
  const router = useRouter();
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [unclaimedPreorders, setUnclaimedPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Load preorders
  useEffect(() => {
    async function loadPreorders() {
      try {
        const response = await fetch('/api/account/preorders');
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/account/login');
            return;
          }
          throw new Error(data.error?.message || 'Failed to load preorders');
        }

        setPreorders(data.data.preorders || []);
        setUnclaimedPreorders(data.data.unclaimedPreorders || []);
        setLoading(false);
      } catch {
        setError('Грешка при зареждане на поръчките');
        setLoading(false);
      }
    }

    loadPreorders();
  }, [router]);

  const handleClaimPreorder = async (preorderId: string) => {
    setClaimingId(preorderId);
    setError(null);

    try {
      const response = await fetch('/api/account/preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preorderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Грешка при свързване на поръчката');
        setClaimingId(null);
        return;
      }

      // Reload preorders
      const reloadResponse = await fetch('/api/account/preorders');
      const reloadData = await reloadResponse.json();
      setPreorders(reloadData.data.preorders || []);
      setUnclaimedPreorders(reloadData.data.unclaimedPreorders || []);
      setClaimingId(null);
    } catch {
      setError('Грешка при свързване на поръчката');
      setClaimingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBoxType = (boxType: string) => {
    const types: Record<string, string> = {
      'monthly-standard': 'Месечна - Стандартна',
      'monthly-premium': 'Месечна - Премиум',
      'onetime-standard': 'Еднократна - Стандартна',
      'onetime-premium': 'Еднократна - Премиум',
    };
    return types[boxType] || boxType;
  };

  if (loading) {
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Моите поръчки</h1>
            <Link
              href="/account"
              className="text-blue-100 hover:text-white transition"
            >
              ← Назад
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Unclaimed Preorders */}
        {unclaimedPreorders.length > 0 && (
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Намерени са поръчки с вашия имейл
              </h3>
              <p className="text-sm text-yellow-800">
                Открихме {unclaimedPreorders.length} поръчка(и), направени с вашия имейл преди да
                създадете акаунт. Свържете ги с профила си, за да ги управлявате.
              </p>
            </div>

            <div className="space-y-4">
              {unclaimedPreorders.map((preorder) => (
                <div
                  key={preorder.id}
                  className="bg-white rounded-lg shadow p-6 border-2 border-yellow-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {preorder.order_id}
                        </span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                          Несвързана
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatBoxType(preorder.box_type)} •{' '}
                        {formatDate(preorder.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClaimPreorder(preorder.id)}
                      disabled={claimingId === preorder.id}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claimingId === preorder.id ? 'Свързване...' : 'Свържи'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Preorders */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Моите поръчки ({preorders.length})
          </h2>

          {preorders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Все още нямате поръчки
              </h3>
              <p className="text-gray-600 mb-6">
                Направете вашата първа поръчка и тя ще се появи тук.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Направи поръчка
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {preorders.map((preorder) => (
                <div
                  key={preorder.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {preorder.order_id}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Активна
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {formatBoxType(preorder.box_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Поръчана на {formatDate(preorder.created_at)}
                      </p>
                      {preorder.wants_personalization && (
                        <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          С персонализация
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/preorder/edit?token=${preorder.id}`}
                      className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Детайли
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
