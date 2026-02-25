'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailUnsubscribeRow } from '@/lib/supabase/types';

interface UnsubscribesTableProps {
  unsubscribes: EmailUnsubscribeRow[];
  total: number;
  page: number;
  perPage: number;
  search?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  brevo: 'Brevo',
  manual: 'Ръчно',
  admin: 'Админ',
};

export default function UnsubscribesTable({
  unsubscribes,
  total,
  page,
  perPage,
  search,
}: UnsubscribesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('search', searchInput.trim());
    params.set('page', '1');
    router.push(`/admin/emails/unsubscribes?${params.toString()}`);
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `/admin/emails/unsubscribes?${params.toString()}`;
  }

  function handleResubscribe(email: string) {
    setError(null);
    setSuccess(null);
    setConfirmEmail(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/emails/unsubscribes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error ?? `Грешка (${res.status}).`);
          return;
        }

        setSuccess(`${email} е абониран отново.`);
        router.refresh();
      } catch {
        setError('Мрежова грешка.');
      }
    });
  }

  return (
    <div>
      {/* Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Търси по имейл..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Търси
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                router.push('/admin/emails/unsubscribes');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Изчисти
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm">
        {unsubscribes.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            Няма отписани имейли.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Имейл</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Източник</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Причина</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Дата</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unsubscribes.map((unsub) => (
                    <tr key={unsub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {unsub.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {SOURCE_LABELS[unsub.source] ?? unsub.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={unsub.reason ?? ''}>
                        {unsub.reason ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(unsub.unsubscribed_at).toLocaleString('bg-BG')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setConfirmEmail(unsub.email)}
                          disabled={isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        >
                          Повторно абониране
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-4 border-t">
                {page > 1 && (
                  <a
                    href={pageUrl(page - 1)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    ← Предишна
                  </a>
                )}
                <span className="text-sm text-gray-500">
                  Стр. {page} от {totalPages}
                </span>
                {page < totalPages && (
                  <a
                    href={pageUrl(page + 1)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Следваща →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Re-subscribe confirmation modal */}
      {confirmEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmEmail(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-3">
              Повторно абониране
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Сигурни ли сте, че искате да абонирате отново <strong>{confirmEmail}</strong>?
              Този контакт ще получава бъдещи кампании.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmEmail(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Назад
              </button>
              <button
                onClick={() => handleResubscribe(confirmEmail)}
                disabled={isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Обработка...' : 'Абонирай отново'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
