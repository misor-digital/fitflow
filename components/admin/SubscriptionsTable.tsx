'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { SubscriptionWithUserInfo } from '@/lib/subscription';
import {
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  FREQUENCY_LABELS,
} from '@/lib/subscription';
import { formatDateTimeShort } from '@/lib/utils/date';
import { toTelHref } from '@/lib/utils/sanitize';
import { formatPriceEur } from '@/lib/catalog';
import { SubscriptionCoreInfo, SubscriptionPersonalization } from '@/components/admin/SubscriptionSummaryParts';

const COLUMN_COUNT = 8;

interface SubscriptionsTableProps {
  subscriptions: SubscriptionWithUserInfo[];
  boxTypeNames: Record<string, string>;
  total: number;
  currentPage: number;
  perPage: number;
}

export function SubscriptionsTable({
  subscriptions,
  boxTypeNames,
  total,
  currentPage,
  perPage,
}: SubscriptionsTableProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Номер</th>
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
              {subscriptions.map((sub) => {
                const isExpanded = expandedId === sub.id;
                const detailsId = `subscription-details-${sub.id}`;

                return (
                  <Fragment key={sub.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* Subscription Number */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] font-mono text-xs font-medium transition-colors"
                        >
                          {sub.subscription_number}
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{sub.user_first_name} {sub.user_last_name}</div>
                        <div className="text-xs text-gray-500">{sub.user_email}</div>
                        {sub.user_phone && (
                          <div className="text-xs text-gray-500">
                            Тел:{' '}
                            <a href={toTelHref(sub.user_phone)} className="hover:underline">
                              {sub.user_phone}
                            </a>
                          </div>
                        )}
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
                        {formatPriceEur(Number(sub.current_price_eur))}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-gray-500">
                        {formatDateTimeShort(sub.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                            aria-expanded={isExpanded}
                            aria-controls={detailsId}
                            title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                            className="text-sm text-[var(--color-brand-navy)] hover:underline"
                          >
                            {isExpanded ? '▲ Скрий' : '▼ Детайли'}
                          </button>
                          <Link
                            href={`/admin/subscriptions/${sub.id}`}
                            className="text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] text-sm font-medium transition-colors"
                          >
                            Виж →
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded details */}
                    {isExpanded && (
                      <tr id={detailsId} className="border-b border-gray-100">
                        <td colSpan={COLUMN_COUNT} className="bg-gray-50 px-4 py-4">
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <SubscriptionCoreInfo
                                subscription={sub}
                                userFirstName={sub.user_first_name}
                                userLastName={sub.user_last_name}
                                userEmail={sub.user_email}
                                userPhone={sub.user_phone}
                                defaultAddress={sub.default_address}
                              />
                            </div>
                            <SubscriptionPersonalization subscription={sub} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
