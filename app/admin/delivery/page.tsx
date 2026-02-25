import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getDeliveryCycles, getDeliveryConfigMap } from '@/lib/data';
import {
  computeCycleState,
  getDeliveryConfig,
  calculateNextNDeliveryDates,
  formatDeliveryDate,
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_COLORS,
} from '@/lib/delivery';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { DeliveryCycleRow } from '@/lib/delivery';

export const metadata: Metadata = {
  title: 'Доставки | Администрация | FitFlow',
};

export default async function DeliveryPage() {
  await requireStaff([...ORDER_VIEW_ROLES]);

  const [cycles, configMap] = await Promise.all([
    getDeliveryCycles(),
    getDeliveryConfigMap(),
  ]);

  const config = getDeliveryConfig(configMap);
  const nextDates = calculateNextNDeliveryDates(config, 1);

  // Group cycles by status: upcoming first, then delivered, then archived
  const upcoming: (DeliveryCycleRow & { state: ReturnType<typeof computeCycleState> })[] = [];
  const delivered: (DeliveryCycleRow & { state: ReturnType<typeof computeCycleState> })[] = [];
  const archived: (DeliveryCycleRow & { state: ReturnType<typeof computeCycleState> })[] = [];

  for (const cycle of cycles) {
    const state = computeCycleState(cycle);
    const entry = { ...cycle, state };
    if (cycle.status === 'upcoming') upcoming.push(entry);
    else if (cycle.status === 'delivered') delivered.push(entry);
    else archived.push(entry);
  }

  // Sort upcoming by delivery_date ascending (soonest first)
  upcoming.sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));

  const groups = [
    { label: 'Предстоящи', items: upcoming, highlight: true },
    { label: 'Доставени', items: delivered, highlight: false },
    { label: 'Архивирани', items: archived, highlight: false },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Доставки
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {cycles.length}
          </span>
        </div>
        <Link
          href="/admin/delivery/create"
          className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Нов цикъл
        </Link>
      </div>

      {/* Next delivery info */}
      {nextDates.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Следваща дата на доставка: <strong>{formatDeliveryDate(nextDates[0].toISOString().split('T')[0])}</strong>
        </div>
      )}

      {/* Cycles grouped by status */}
      {cycles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">Няма създадени цикли на доставка.</p>
          <Link href="/admin/delivery/create" className="text-[var(--color-brand-orange)] hover:underline text-sm">
            Създай първия цикъл
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) =>
            group.items.length > 0 ? (
              <div key={group.label}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {group.label} ({group.items.length})
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Дата</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Заглавие</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Статус</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Съдържание</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((cycle) => (
                        <tr
                          key={cycle.id}
                          className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                            group.highlight ? 'bg-orange-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-gray-700">
                            {cycle.state.formattedDate}
                            {cycle.state.daysUntilDelivery !== null && (
                              <span className="ml-2 text-xs text-blue-600">
                                (след {cycle.state.daysUntilDelivery} дни)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {cycle.title || cycle.state.monthYear}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                                CYCLE_STATUS_COLORS[cycle.status]
                              }`}
                            >
                              {CYCLE_STATUS_LABELS[cycle.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {cycle.is_revealed ? (
                              <span className="text-green-600 font-medium">Разкрито</span>
                            ) : (
                              <span className="text-gray-400">Скрито</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/delivery/${cycle.id}`}
                              className="text-[var(--color-brand-orange)] hover:underline font-medium text-sm"
                            >
                              Управление →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
