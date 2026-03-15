'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { FeedbackFormRow } from '@/lib/supabase/types';

interface Props {
  form: FeedbackFormRow;
}

export default function FeedbackFormActions({ form }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function toggleActive() {
    startTransition(async () => {
      await fetch(`/api/admin/feedback/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !form.is_active }),
      });
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm('Сигурни ли сте, че искате да изтриете този формуляр? Всички отговори ще бъдат изтрити.')) {
      return;
    }
    startTransition(async () => {
      await fetch(`/api/admin/feedback/${form.id}`, { method: 'DELETE' });
      router.push('/admin/feedback');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {form.is_active ? (
        <span
          title="Деактивирайте формуляра, за да го редактирате"
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-400 cursor-not-allowed"
        >
          Редактирай
        </span>
      ) : (
        <a
          href={`/admin/feedback/${form.id}/edit`}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--color-brand-orange)] text-[var(--color-brand-orange)] hover:bg-orange-50"
        >
          Редактирай
        </a>
      )}

      <button
        onClick={toggleActive}
        disabled={isPending}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 ${
          form.is_active
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-green-600 text-white hover:opacity-90'
        }`}
      >
        {isPending ? '...' : form.is_active ? 'Деактивирай' : 'Активирай'}
      </button>

      <a
        href={`/feedback/${form.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        Преглед ↗
      </a>

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60"
      >
        Изтрий
      </button>
    </div>
  );
}
