/**
 * Request Preorder Edit Page
 * Allows customers to request an edit link for their preorder
 * URL: /preorder/request-edit
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function RequestEditPage() {
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/preorder/request-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          orderId: orderId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('Твърде много заявки. Моля, опитай отново по-късно.');
        } else {
          setError(data.error || 'Грешка при изпращане на линка');
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setExpiresAt(data.expiresAt);
      setLoading(false);
    } catch (err) {
      console.error('Error requesting edit:', err);
      setError('Грешка при изпращане на линка. Моля, опитайте отново.');
      setLoading(false);
    }
  };

  const formatExpiryTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('bg-BG', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#b3e0f7] via-[#d4ebf7] via-[#fde8d5] to-[#fcd5a8] pt-20 sm:pt-24 pb-12 sm:pb-16 px-3 sm:px-5">
        <div className="max-w-2xl mx-auto mt-12 sm:mt-16">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#023047] mb-4">
              ✏️ Редактирай поръчката си
            </h1>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              Въведи имейла и номера на поръчката си, за да получиш сигурен линк за редакция
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10">
            {success ? (
              // Success State
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Линкът е изпратен! 📧
                </h2>
                <p className="text-gray-600 mb-2">
                  Изпратихме ти имейл със сигурен линк за редакция на поръчката. Моля, провери пощата си.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Линкът е валиден до <strong>{formatExpiryTime(expiresAt)}</strong>
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                      setOrderId('');
                      setExpiresAt('');
                    }}
                    className="w-full bg-gradient-to-r from-[#FB7D00] to-[#ff9a3d] text-white py-3 px-6 rounded-lg hover:from-[#e67200] hover:to-[#ff8c2e] transition font-semibold"
                  >
                    Заявка за друга поръчка
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

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex gap-3">
                      <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm text-blue-800 font-semibold mb-1">
                          Къде да намеря номера на поръчката?
                        </p>
                        <p className="text-sm text-blue-700">
                          Номерът на поръчката е изпратен в потвърдителния имейл след завършване на поръчката. Започва с <strong>FF-</strong> следван от цифри.
                        </p>
                      </div>
                    </div>
                  </div>

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
                    <p className="mt-2 text-xs text-gray-500">
                      Използвай същия имейл, с който си направил поръчката
                    </p>
                  </div>

                  {/* Order ID Input */}
                  <div>
                    <label htmlFor="orderId" className="block text-sm font-semibold text-gray-700 mb-2">
                      Номер на поръчката *
                    </label>
                    <input
                      type="text"
                      id="orderId"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FB7D00] focus:border-transparent text-base font-mono"
                      placeholder="FF-123456"
                      required
                      disabled={loading}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Например: FF-123456
                    </p>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex gap-3">
                      <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <p className="text-sm text-green-800 font-semibold mb-1">
                          🔒 Сигурност
                        </p>
                        <p className="text-sm text-green-700">
                          Линкът за редакция е валиден само 24 часа и може да се използва само веднъж. Никога не споделяй линка с други хора.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#FB7D00] to-[#ff9a3d] text-white py-4 px-6 rounded-lg hover:from-[#e67200] hover:to-[#ff8c2e] transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg"
                  >
                    {loading ? 'Изпращане...' : '📧 Изпрати линк за редакция'}
                  </button>
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

          {/* Help Section */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ❓ Често задавани въпроси
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Колко време е валиден линкът?
                </p>
                <p className="text-sm text-gray-600">
                  Линкът за редакция е валиден 24 часа от момента на изпращане.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Какво мога да редактирам?
                </p>
                <p className="text-sm text-gray-600">
                  Можеш да промениш адреса за доставка, телефонния номер и други детайли на поръчката.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Не получих имейл?
                </p>
                <p className="text-sm text-gray-600">
                  Провери папката за спам. Ако все още не го виждаш, опитай да заявиш нов линк след няколко минути.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
