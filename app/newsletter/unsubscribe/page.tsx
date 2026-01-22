/**
 * Newsletter Unsubscribe Page
 * Unsubscribes from newsletter via token
 * URL: /newsletter/unsubscribe?token=xxx
 */

'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewsletterUnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const unsubscribe = useCallback(async () => {
    try {
      const response = await fetch(`/api/newsletter/unsubscribe?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Грешка при отписване');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError('Грешка при отписване');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('Невалиден линк за отписване');
      setLoading(false);
      return;
    }

    unsubscribe();
  }, [token, unsubscribe]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Обработване...</p>
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
          <Link
            href="/"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Към началната страница
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-gray-500 text-6xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Отписан/а успешно
          </h1>
          <p className="text-gray-600 mb-6">
            Вече няма да получаваш имейли от нашия бюлетин.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-3">
              Съжаляваме, че те губим! Ако промениш решението си, винаги можеш да се абонираш отново.
            </p>
            <p className="text-xs text-gray-500">
              Ще получиш имейл с потвърждение за отписването.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-purple-600 to-purple-800 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-900 transition"
            >
              Към началната страница
            </Link>
            <button
              onClick={() => window.location.href = '/#newsletter'}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Абонирай се отново
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <NewsletterUnsubscribeContent />
    </Suspense>
  );
}
