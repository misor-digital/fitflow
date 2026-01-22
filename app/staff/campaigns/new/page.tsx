/**
 * Create Campaign Page
 * Form to create a new newsletter campaign
 * URL: /staff/campaigns/new
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState('');

  const checkAuth = useCallback(async () => {
    const sessionData = localStorage.getItem('supabase.auth.token');
    if (!sessionData) {
      router.push('/staff/login');
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Validate
      if (!subject.trim() || !htmlContent.trim() || !textContent.trim()) {
        setError('Всички полета са задължителни');
        setLoading(false);
        return;
      }

      // Create campaign
      const response = await fetch('/api/staff/campaigns/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          htmlContent: htmlContent.trim(),
          textContent: textContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при създаване на кампанията');
        setLoading(false);
        return;
      }

      // Redirect to campaign details
      router.push(`/staff/campaigns/${data.campaign.id}`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Грешка при създаване на кампанията');
      setLoading(false);
    }
  };

  const generateTextFromHtml = () => {
    // Simple HTML to text conversion
    const text = htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    setTextContent(text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/staff/campaigns" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
            ← Назад към кампаниите
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Нова кампания</h1>
          <p className="text-sm text-gray-600">Създайте нова newsletter кампания</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Subject */}
            <div className="mb-6">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Тема на имейла *
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder="Напр: Нови продукти в FitFlow"
                required
              />
            </div>

            {/* HTML Content */}
            <div className="mb-6">
              <label htmlFor="htmlContent" className="block text-sm font-medium text-gray-700 mb-2">
                HTML съдържание *
              </label>
              <textarea
                id="htmlContent"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent font-mono text-sm text-gray-900"
                placeholder="<html>...</html>"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Въведете HTML кода на имейла. Може да използвате готов шаблон.
              </p>
            </div>

            {/* Text Content */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="textContent" className="block text-sm font-medium text-gray-700">
                  Текстово съдържание *
                </label>
                <button
                  type="button"
                  onClick={generateTextFromHtml}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Генерирай от HTML
                </button>
              </div>
              <textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder="Текстова версия на имейла за клиенти без HTML поддръжка"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Текстова версия на имейла (за клиенти, които не поддържат HTML).
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Съвети за създаване на кампания</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Използвайте ясна и привлекателна тема</li>
                <li>• Включете персонализация където е възможно</li>
                <li>• Добавете ясен call-to-action бутон</li>
                <li>• Тествайте имейла преди изпращане</li>
                <li>• Включете линк за отписване (автоматично се добавя)</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Създаване...' : 'Създай чернова'}
              </button>
              <Link
                href="/staff/campaigns"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-center"
              >
                Отказ
              </Link>
            </div>
          </form>
        </div>

        {/* Template Examples */}
        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Примерни шаблони</h2>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Прост шаблон</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
{`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #7c3aed;">Здравейте!</h1>
  <p>Вашето съдържание тук...</p>
  <a href="https://fitflow.bg" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Виж повече
  </a>
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="font-size: 12px; color: #6b7280;">
    FitFlow - Вашият фитнес партньор<br>
    <a href="{{unsubscribe_url}}">Отписване от бюлетина</a>
  </p>
</body>
</html>`}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
