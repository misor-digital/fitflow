/**
 * Newsletter Subscribe Page
 * Standalone page for newsletter subscription
 * URL: /newsletter/subscribe
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function NewsletterSubscribePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          source: 'subscribe_page',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Грешка при абониране');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setEmail('');
      setLoading(false);
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('Грешка при абониране. Моля, опитайте отново.');
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#b3e0f7] via-[#d4ebf7] via-[#fde8d5] to-[#fcd5a8] pt-20 sm:pt-24 pb-12 sm:pb-16 px-3 sm:px-5">
        <div className="max-w-2xl mx-auto mt-12 sm:mt-16">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#023047] mb-4">
              📧 Абонирай се за нашия бюлетин
            </h1>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              Получавай ексклузивни оферти, съвети за фитнес и новини за нови продукти директно в твоята поща!
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10">
            {success ? (
              // Success State
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Благодарим за абонамента! 🎉
                </h2>
                <p className="text-gray-600 mb-6">
                  Изпратихме ти имейл за потвърждение. Моля, провери пощата си и кликни на линка за да завършиш абонамента.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                    }}
                    className="w-full bg-gradient-to-r from-[#FB7D00] to-[#ff9a3d] text-white py-3 px-6 rounded-lg hover:from-[#e67200] hover:to-[#ff8c2e] transition font-semibold"
                  >
                    Абонирай друг имейл
                  </button>
                  <Link
                    href="/"
                    className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition font-semibold text-center"
                  >
                    Назад към началото
                  </Link>
                </div>
              </div>
            ) : (
              // Form State
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Имейл адрес *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FB7D00] focus:border-transparent text-base"
                      placeholder="твоят@имейл.bg"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Benefits List */}
                  <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#ff9a3d]/10 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Какво ще получаваш:
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-[#FB7D00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Ексклузивни промо кодове и отстъпки</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-[#FB7D00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Първи достъп до нови продукти</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-[#FB7D00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Съвети за фитнес и здравословен живот</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-[#FB7D00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Месечни предизвикателства и награди</span>
                      </li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#FB7D00] to-[#ff9a3d] text-white py-4 px-6 rounded-lg hover:from-[#e67200] hover:to-[#ff8c2e] transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg"
                  >
                    {loading ? 'Абониране...' : '✉️ Абонирай се сега'}
                  </button>

                  {/* Privacy Notice */}
                  <p className="text-xs text-gray-500 text-center">
                    Абонирайки се, приемаш нашата{' '}
                    <Link href="/privacy" className="text-[#FB7D00] hover:underline">
                      Политика за поверителност
                    </Link>
                    . Можеш да се отпишеш по всяко време.
                  </p>
                </form>

                {/* Back Link */}
                <div className="mt-6 text-center">
                  <Link href="/" className="text-[#FB7D00] hover:text-[#e67200] font-semibold text-sm">
                    ← Назад към началото
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Вече имаш абонамент?{' '}
              <Link href="/newsletter/unsubscribe" className="text-[#FB7D00] hover:underline font-semibold">
                Отписване от бюлетина
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
