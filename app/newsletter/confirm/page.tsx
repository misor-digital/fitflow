/**
 * Newsletter Confirmation Page
 * Confirms newsletter subscription via token
 * URL: /newsletter/confirm?token=xxx
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function NewsletterConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Невалиден линк за потвърждение');
      setLoading(false);
      return;
    }

    confirmSubscription();
  }, [token]);

  const confirmSubscription = async () => {
    try {
      const response = await fetch(`/api/newsletter/confirm?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Грешка при потвърждение');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('Грешка при потвърждение');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Потвърждаване на абонамента...</p>
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
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Добре дошъл/дошла! 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            Абонаментът ти за бюлетина е потвърден успешно!
          </p>
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-800">
              Ще получаваш новини, специални оферти и съвети за фитнес директно в пощенската си кутия.
            </p>
          </div>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-purple-600 to-purple-800 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-900 transition"
          >
            Към началната страница
          </a>
        </div>
      </div>
    );
  }

  return null;
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <NewsletterConfirmContent />
    </Suspense>
  );
}
