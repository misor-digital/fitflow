'use client';

import Link from 'next/link';
import type { SubscriptionWithUserInfo } from '@/lib/subscription';
import {
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  FREQUENCY_LABELS,
} from '@/lib/subscription';
import { formatDeliveryDate } from '@/lib/delivery';
import { formatPriceDual, eurToBgnSync } from '@/lib/catalog';

interface SubscriptionsTableProps {
  subscriptions: SubscriptionWithUserInfo[];
  boxTypeNames: Record<string, string>;
  eurToBgnRate: number;
  total: number;
  currentPage: number;
  perPage: number;
}

export function SubscriptionsTable({
  subscriptions,
  boxTypeNames,
  eurToBgnRate,
  total,
  currentPage,
  perPage,
}: SubscriptionsTableProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  return (
    <div>
      {/* Results summary */}
      <p className="text-sm text-gray-500 mb-3">
        Показване на {start}–{end} от {total} абонаменти
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Клиент</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Кутия</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Честота</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Цена</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Създаден</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Client */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{sub.user_full_name}</div>
                    <div className="text-xs text-gray-500">{sub.user_email}</div>
                  </td>

                  {/* Box Type */}
                  <td className="px-4 py-3 text-gray-700">
                    {boxTypeNames[sub.box_type] ?? sub.box_type}
                  </td>

                  {/* Frequency */}
                  <td className="px-4 py-3 text-gray-700">
                    {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        SUBSCRIPTION_STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-gray-700 font-mono">
                    {formatPriceDual(Number(sub.current_price_eur), eurToBgnSync(Number(sub.current_price_eur), eurToBgnRate))}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-gray-500">
                    {formatDeliveryDate(sub.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/subscriptions/${sub.id}`}
                      className="text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] text-sm font-medium transition-colors"
                    >
                      Виж →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
