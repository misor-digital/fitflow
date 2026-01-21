/**
 * Preorder Edit Page
 * Token-based editing (no login required)
 * URL: /preorder/edit?token=xxx
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface PreorderData {
  id: string;
  order_id: string;
  full_name: string;
  email: string;
  phone: string;
  box_type: string;
  wants_personalization: boolean;
  sports?: string[];
  sport_other?: string;
  colors?: string[];
  flavors?: string[];
  flavor_other?: string;
  size_upper?: string;
  size_lower?: string;
  dietary?: string[];
  dietary_other?: string;
  additional_notes?: string;
}

function PreorderEditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preorder, setPreorder] = useState<PreorderData | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<PreorderData>>({});

  useEffect(() => {
    if (!token) {
      setError('Невалиден линк за редакция');
      setLoading(false);
      return;
    }

    fetchPreorder();
  }, [token]);

  const fetchPreorder = async () => {
    try {
      const response = await fetch(`/api/preorder/edit?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Грешка при зареждане на поръчката');
        setLoading(false);
        return;
      }

      setPreorder(data.preorder);
      setFormData(data.preorder);
      setLoading(false);
    } catch (err) {
      setError('Грешка при зареждане на поръчката');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/preorder/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, updates: formData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Грешка при запазване');
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError('Грешка при запазване');
      setSaving(false);
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Грешка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Към началната страница
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Успешно запазено!</h1>
          <p className="text-gray-600 mb-6">
            Промените са запазени. Ще получите имейл с потвърждение.
          </p>
          <p className="text-sm text-gray-500">Пренасочване към началната страница...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Редактирай поръчка
            </h1>
            <p className="text-gray-600">
              Поръчка #{preorder?.order_id}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Име и фамилия *
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон *
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                required
              />
            </div>

            {/* Sports */}
            {formData.wants_personalization && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Спортове
                </label>
                <textarea
                  value={formData.sports?.join(', ') || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    sports: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  rows={2}
                  placeholder="Въведи спортове, разделени със запетая"
                />
              </div>
            )}

            {/* Colors */}
            {formData.wants_personalization && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цветове
                </label>
                <textarea
                  value={formData.colors?.join(', ') || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  rows={2}
                  placeholder="Въведи цветове, разделени със запетая"
                />
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Допълнителни бележки
              </label>
              <textarea
                value={formData.additional_notes || ''}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                rows={4}
                placeholder="Допълнителна информация..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Запазване...' : 'Запази промените'}
              </button>
              <a
                href="/"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Отказ
              </a>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Важно:</strong> Този линк може да се използва само веднъж и е валиден за 24 часа.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreorderEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <PreorderEditContent />
    </Suspense>
  );
}
