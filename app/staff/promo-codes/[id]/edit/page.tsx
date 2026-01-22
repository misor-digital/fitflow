/**
 * Edit Promo Code Page
 * Form to edit an existing promo code
 * URL: /staff/promo-codes/[id]/edit
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
}

interface PromoStats {
  totalUses: number;
  totalDiscount: number;
  recentOrders: Array<{
    id: string;
    customer_email: string;
    total_price: number;
    discount_amount: number;
    created_at: string;
  }>;
}

export default function EditPromoCodePage() {
  const router = useRouter();
  const params = useParams();
  const promoId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadPromoCode();
  }, [promoId]);

  const checkAuthAndLoadPromoCode = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Load promo code
      const response = await fetch(`/api/staff/promo-codes/${promoId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load promo code');
      }

      const data = await response.json();
      const pc = data.promoCode;
      
      setPromoCode(pc);
      setCode(pc.code);
      setDiscountType(pc.discount_type);
      setDiscountValue(pc.discount_value.toString());
      setValidFrom(pc.valid_from ? pc.valid_from.split('T')[0] : '');
      setValidUntil(pc.valid_until ? pc.valid_until.split('T')[0] : '');
      setUsageLimit(pc.usage_limit ? pc.usage_limit.toString() : '');

      // Load stats
      const statsResponse = await fetch(`/api/staff/promo-codes/${promoId}/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading promo code:', err);
      setError('Грешка при зареждане на промо кода');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Validate
      if (!code.trim() || !discountValue) {
        setError('Кодът и стойността на отстъпката са задължителни');
        setSaving(false);
        return;
      }

      const value = parseFloat(discountValue);
      if (isNaN(value) || value <= 0) {
        setError('Стойността на отстъпката трябва да бъде положително число');
        setSaving(false);
        return;
      }

      // Validate percentage range
      if (discountType === 'percentage' && (value < 0 || value > 100)) {
        setError('Процентната отстъпка трябва да бъде между 0 и 100');
        setSaving(false);
        return;
      }

      // Validate date range
      if (validFrom && validUntil) {
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        if (untilDate <= fromDate) {
          setError('Крайната дата трябва да бъде след началната дата');
          setSaving(false);
          return;
        }
      }

      // Update promo code
      const response = await fetch(`/api/staff/promo-codes/${promoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: value,
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при актуализиране на промо кода');
        setSaving(false);
        return;
      }

      // Redirect to promo codes list
      router.push('/staff/promo-codes');
    } catch (err) {
      console.error('Error updating promo code:', err);
      setError('Грешка при актуализиране на промо кода');
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (!promoCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Промо кодът не е намерен</p>
          <Link href="/staff/promo-codes" className="text-purple-600 hover:text-purple-800">
            Назад към промо кодовете
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800">
              Табло
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/staff/promo-codes" className="text-purple-600 hover:text-purple-800">
              Промо кодове
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Редактиране</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Редактиране на промо код</h1>
          <p className="text-sm text-gray-600">{promoCode.code}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-8">
              <form onSubmit={handleSubmit}>
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {/* Status Badge */}
                <div className="mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    promoCode.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {promoCode.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                {/* Code */}
                <div className="mb-6">
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Промо код *
                  </label>
                  <input
                    type="text"
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900 uppercase"
                    placeholder="Напр: SUMMER2026"
                    required
                  />
                </div>

                {/* Discount Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип отстъпка *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="percentage"
                        checked={discountType === 'percentage'}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                        className="mr-2"
                      />
                      <span className="text-gray-900">Процент (%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="fixed"
                        checked={discountType === 'fixed'}
                        onChange={(e) => setDiscountType(e.target.value as 'fixed')}
                        className="mr-2"
                      />
                      <span className="text-gray-900">Фиксирана сума (лв.)</span>
                    </label>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="mb-6">
                  <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 mb-2">
                    Стойност на отстъпката *
                  </label>
                  <input
                    type="number"
                    id="discountValue"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                    required
                  />
                </div>

                {/* Valid From */}
                <div className="mb-6">
                  <label htmlFor="validFrom" className="block text-sm font-medium text-gray-700 mb-2">
                    Валиден от (опционално)
                  </label>
                  <input
                    type="date"
                    id="validFrom"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* Valid Until */}
                <div className="mb-6">
                  <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-2">
                    Валиден до (опционално)
                  </label>
                  <input
                    type="date"
                    id="validUntil"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* Usage Limit */}
                <div className="mb-6">
                  <label htmlFor="usageLimit" className="block text-sm font-medium text-gray-700 mb-2">
                    Лимит на използване (опционално)
                  </label>
                  <input
                    type="number"
                    id="usageLimit"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                    placeholder="Напр: 100"
                  />
                </div>

                {/* Info Box */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Забележка:</strong> Промените ще се отразят веднага на всички нови поръчки. 
                    Съществуващите поръчки няма да бъдат засегнати.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Запазване...' : 'Запази промените'}
                  </button>
                  <Link
                    href="/staff/promo-codes"
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-center"
                  >
                    Отказ
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            {/* Usage Statistics */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Общо използвания</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalUses || promoCode.usage_count}
                    {promoCode.usage_limit && (
                      <span className="text-sm text-gray-500 ml-2">
                        / {promoCode.usage_limit}
                      </span>
                    )}
                  </p>
                </div>

                {stats && (
                  <div>
                    <p className="text-sm text-gray-600">Обща отстъпка</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.totalDiscount.toFixed(2)} лв.
                    </p>
                  </div>
                )}

                {promoCode.usage_limit && (
                  <div>
                    <p className="text-sm text-gray-600">Оставащи използвания</p>
                    <p className="text-2xl font-bold text-green-600">
                      {promoCode.usage_limit - promoCode.usage_count}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            {stats && stats.recentOrders.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Последни поръчки</h2>
                
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <div key={order.id} className="border-b border-gray-200 pb-3 last:border-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {order.customer_email}
                      </p>
                      <p className="text-xs text-gray-600">
                        Отстъпка: {order.discount_amount.toFixed(2)} лв.
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
