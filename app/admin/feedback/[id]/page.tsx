import { requireStaff } from '@/lib/auth';
import { getFeedbackFormById, getResponsesByForm, getResponseCountByForm } from '@/lib/data/feedback-forms';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import FeedbackFormActions from '@/components/admin/FeedbackFormActions';
import FeedbackResponsesTable from '@/components/admin/FeedbackResponsesTable';
import CopyLinkBox from '@/components/admin/CopyLinkBox';

export const metadata: Metadata = {
  title: 'Детайли формуляр | FitFlow',
};

const FEEDBACK_ROLES = ['super_admin', 'admin', 'marketing', 'content', 'support'] as const;

interface FeedbackDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function FeedbackDetailPage({ params, searchParams }: FeedbackDetailPageProps) {
  await requireStaff([...FEEDBACK_ROLES]);

  const { id } = await params;
  const { page: pageParam } = await searchParams;

  const form = await getFeedbackFormById(id);
  if (!form) notFound();

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const limit = 20;

  const [{ responses, total }, totalResponses] = await Promise.all([
    getResponsesByForm(id, page, limit),
    getResponseCountByForm(id),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/admin/feedback" className="hover:text-[var(--color-brand-orange)]">
          Формуляри
        </Link>
        <span className="mx-2">→</span>
        <span className="text-[var(--color-brand-navy)] font-medium">{form.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">{form.title}</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">/feedback/{form.slug}</p>
        </div>
        <FeedbackFormActions form={form} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Статус</p>
          <p className="text-lg font-bold mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              form.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {form.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Отговори</p>
          <p className="text-lg font-bold mt-1">{totalResponses}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Полета</p>
          <p className="text-lg font-bold mt-1">{form.schema.fields?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Версия</p>
          <p className="text-lg font-bold mt-1">v{form.version}</p>
        </div>
      </div>

      {/* Access link (shown for token-gated forms) */}
      {form.access_token && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">🔒 Ограничен достъп</p>
          <p className="text-xs text-amber-700 mb-2">
            Този формуляр е достъпен само чрез линка по-долу. Включете го в имейл кампанията.
          </p>
          <CopyLinkBox url={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/feedback/${form.slug}?token=${form.access_token}`} />
        </div>
      )}

      {/* Schema overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-[var(--color-brand-navy)] uppercase tracking-wider mb-3">
          Полета на формуляра
        </h2>
        {form.schema.fields?.length ? (
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            {form.schema.fields.map(f => (
              <li key={f.id}>
                <span className="font-medium">{f.label}</span>
                <span className="text-gray-400 ml-2">({f.type})</span>
                {f.required && <span className="text-red-500 ml-1">*</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-400">Няма дефинирани полета.</p>
        )}
      </div>

      {/* Responses table */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-brand-navy)] uppercase tracking-wider">
            Отговори ({totalResponses})
          </h2>
        </div>

        <FeedbackResponsesTable
          responses={responses}
          fields={form.schema.fields ?? []}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {page > 1 && (
              <Link
                href={`/admin/feedback/${id}?page=${page - 1}`}
                className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
              >
                ← Назад
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Страница {page} от {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/admin/feedback/${id}?page=${page + 1}`}
                className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
              >
                Напред →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
