import { requireStaff } from '@/lib/auth';
import { getCampaignsPaginated } from '@/lib/data';
import CampaignStatusBadge from '@/components/admin/CampaignStatusBadge';
import CampaignTypeBadge from '@/components/admin/CampaignTypeBadge';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { EmailCampaignStatusEnum, EmailCampaignTypeEnum } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Кампании | Администрация | FitFlow',
};

const PER_PAGE = 20;

const CAMPAIGN_ROLES = ['super_admin', 'admin', 'content', 'marketing'] as const;

interface CampaignsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    type?: string;
    search?: string;
  }>;
}

/** Relative date formatter in Bulgarian */
function relativeDate(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'току-що';
  if (minutes < 60) return `преди ${minutes} мин`;
  if (hours < 24) return `преди ${hours} ч`;
  if (days < 30) return `преди ${days} дни`;
  return new Date(dateStr).toLocaleDateString('bg-BG');
}

const STATUS_OPTIONS: [EmailCampaignStatusEnum, string][] = [
  ['draft', 'Чернова'],
  ['scheduled', 'Планирана'],
  ['sending', 'Изпращане'],
  ['sent', 'Изпратена'],
  ['cancelled', 'Отказана'],
  ['failed', 'Неуспешна'],
];

const TYPE_OPTIONS: [EmailCampaignTypeEnum, string][] = [
  ['preorder-conversion', 'Преобразуване на предпоръчки'],
  ['lifecycle', 'Абонаменти'],
  ['promotional', 'Промоционална'],
  ['one-off', 'Известие'],
];

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  await requireStaff([...CAMPAIGN_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = (params.status as EmailCampaignStatusEnum) || undefined;
  const type = (params.type as EmailCampaignTypeEnum) || undefined;
  const search = params.search?.trim() || undefined;

  const { campaigns, total } = await getCampaignsPaginated(page, PER_PAGE, {
    status,
    type,
    search,
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      status: params.status,
      type: params.type,
      search: params.search,
      page: params.page,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/admin/campaigns${qs ? `?${qs}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Имейл Кампании
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {total}
          </span>
        </div>
        <Link
          href="/admin/campaigns/create"
          className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Нова кампания
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички статуси</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          name="type"
          defaultValue={params.type ?? ''}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички типове</option>
          {TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <input
          name="search"
          type="text"
          placeholder="Търси по име..."
          defaultValue={params.search ?? ''}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <button
          type="submit"
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Търси
        </button>

        {(status || type || search) && (
          <Link
            href="/admin/campaigns"
            className="text-sm text-gray-500 hover:text-gray-700 self-center underline"
          >
            Изчисти
          </Link>
        )}
      </form>

      {/* Table */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">
            {status || type || search
              ? 'Няма намерени кампании.'
              : 'Няма създадени кампании.'}
          </p>
          {status || type || search ? (
            <Link
              href="/admin/campaigns"
              className="text-[var(--color-brand-orange)] hover:underline text-sm"
            >
              Нулирай филтрите
            </Link>
          ) : (
            <Link
              href="/admin/campaigns/create"
              className="text-[var(--color-brand-orange)] hover:underline text-sm"
            >
              Създайте първата си кампания →
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Име</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Тип</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Статус</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Получатели</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Създадена</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c) => {
                    const pct =
                      c.total_recipients > 0
                        ? Math.round((c.sent_count / c.total_recipients) * 100)
                        : 0;

                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/campaigns/${c.id}`}
                            className="text-[var(--color-brand-navy)] font-medium hover:underline"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <CampaignTypeBadge type={c.campaign_type} />
                        </td>
                        <td className="px-4 py-3">
                          <CampaignStatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 tabular-nums">
                              {c.sent_count} / {c.total_recipients}
                            </span>
                            {c.total_recipients > 0 && (
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500" title={new Date(c.created_at).toLocaleString('bg-BG')}>
                          {relativeDate(c.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/campaigns/${c.id}`}
                            className="text-[var(--color-brand-navy)] hover:underline text-sm"
                          >
                            Детайли →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-6">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
                  ← Предишна
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
                  ) : (
                    <Link
                      key={item}
                      href={buildUrl({ page: String(item) })}
                      className={`px-3 py-1.5 text-sm border rounded-lg ${
                        item === page
                          ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)]'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {item}
                    </Link>
                  ),
                )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Следваща →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
