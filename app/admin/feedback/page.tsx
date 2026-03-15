import { requireStaff } from '@/lib/auth';
import { getFeedbackFormsPaginated, getResponseCountByForm } from '@/lib/data/feedback-forms';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Обратна връзка | Администрация | FitFlow',
};

const PER_PAGE = 20;
const FEEDBACK_ROLES = ['super_admin', 'admin', 'marketing', 'content', 'support'] as const;

interface FeedbackPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function FeedbackFormsPage({ searchParams }: FeedbackPageProps) {
  await requireStaff([...FEEDBACK_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const isActive = params.status === 'active'
    ? true
    : params.status === 'inactive'
      ? false
      : undefined;
  const search = params.search?.trim() || undefined;

  const { forms, total } = await getFeedbackFormsPaginated(page, PER_PAGE, {
    isActive,
    search,
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Fetch response counts in parallel
  const responseCounts = await Promise.all(
    forms.map(f => getResponseCountByForm(f.id)),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Формуляри за обратна връзка
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} формуляр{total !== 1 ? 'а' : ''}
          </p>
        </div>
        <Link
          href="/admin/feedback/new"
          className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Нов формуляр
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички статуси</option>
          <option value="active">Активни</option>
          <option value="inactive">Неактивни</option>
        </select>

        <input
          name="search"
          type="text"
          placeholder="Търсене по заглавие или slug..."
          defaultValue={search ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <button
          type="submit"
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Филтрирай
        </button>
      </form>

      {/* Table */}
      {forms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">Няма намерени формуляри</p>
          <p className="text-sm mt-1">Създайте нов формуляр за обратна връзка.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Заглавие</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-center">Полета</th>
                <th className="px-4 py-3 font-medium text-center">Отговори</th>
                <th className="px-4 py-3 font-medium">Създаден</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((form, i) => (
                <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[var(--color-brand-navy)]">
                    {form.title}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    /feedback/{form.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        form.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {form.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {form.schema.fields?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {responseCounts[i]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(form.created_at).toLocaleDateString('bg-BG')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/feedback/${form.id}`}
                      className="text-[var(--color-brand-orange)] hover:underline text-sm font-medium"
                    >
                      Детайли →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/admin/feedback?page=${page - 1}${params.status ? `&status=${params.status}` : ''}${search ? `&search=${search}` : ''}`}
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
              href={`/admin/feedback?page=${page + 1}${params.status ? `&status=${params.status}` : ''}${search ? `&search=${search}` : ''}`}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
            >
              Напред →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
