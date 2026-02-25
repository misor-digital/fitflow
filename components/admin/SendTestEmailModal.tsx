'use client';

import { useState, useTransition } from 'react';

interface SendTestEmailModalProps {
  campaignId: string;
  defaultEmail?: string;
  onClose: () => void;
}

export default function SendTestEmailModal({
  campaignId,
  defaultEmail = '',
  onClose,
}: SendTestEmailModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleSend() {
    if (!email.trim()) return;
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/campaigns/${campaignId}/send-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (res.ok) {
          setResult({ ok: true, message: 'Тестовият имейл е изпратен успешно.' });
        } else {
          const json = await res.json().catch(() => null);
          setResult({ ok: false, message: json?.error ?? `Грешка (${res.status}).` });
        }
      } catch {
        setResult({ ok: false, message: 'Мрежова грешка. Опитайте отново.' });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-4">
          Изпрати тестов имейл
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имейл адрес
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="test@example.com"
              autoFocus
            />
          </div>

          {result && (
            <div
              className={`text-sm rounded-lg px-4 py-3 ${
                result.ok
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Затвори
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || !email.trim()}
            className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Изпращане...' : 'Изпрати'}
          </button>
        </div>
      </div>
    </div>
  );
}
