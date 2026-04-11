'use client';

import { useState } from 'react';
import type { Preorder, PreorderConversionStatus } from '@/lib/supabase/types';
import { formatDateTimeShort } from '@/lib/utils/date';

interface LegacyPreordersTableProps {
  preorders: Array<Preorder & { converted_order_number?: string }>;
  boxTypeNames: Record<string, string>;
  conversionStatusLabels: Record<PreorderConversionStatus, string>;
  conversionStatusColors: Record<PreorderConversionStatus, string>;
}

export function LegacyPreordersTable({
  preorders,
  boxTypeNames,
  conversionStatusLabels,
  conversionStatusColors,
}: LegacyPreordersTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyConversionUrl(preorder: Preorder) {
    if (!preorder.conversion_token) return;
    const url = `${window.location.origin}/order/convert?token=${preorder.conversion_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(preorder.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-3 px-4 text-sm font-medium text-gray-500">Номер</th>
            <th className="py-3 px-4 text-sm font-medium text-gray-500">Клиент</th>
            <th className="py-3 px-4 text-sm font-medium text-gray-500">Кутия</th>
            <th className="py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
            <th className="py-3 px-4 text-sm font-medium text-gray-500">Поръчка</th>
            <th className="py-3 px-4 text-sm font-medium text-gray-500">Дата</th>
          </tr>
        </thead>
        <tbody>
          {preorders.map(preorder => (
            <tr key={preorder.id} className="border-b hover:bg-gray-50">
              {/* Order ID */}
              <td className="py-3 px-4 text-sm font-mono">
                {preorder.order_id}
              </td>

              {/* Customer */}
              <td className="py-3 px-4">
                <div className="text-sm font-medium">{preorder.full_name}</div>
                <div className="text-xs text-gray-500">{preorder.email}</div>
              </td>

              {/* Box type */}
              <td className="py-3 px-4 text-sm">
                {boxTypeNames[preorder.box_type] ?? preorder.box_type}
              </td>

              {/* Conversion status */}
              <td className="py-3 px-4">
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                  conversionStatusColors[preorder.conversion_status]
                }`}>
                  {conversionStatusLabels[preorder.conversion_status]}
                </span>
              </td>

              {/* Order link / Conversion URL */}
              <td className="py-3 px-4 text-sm">
                {preorder.conversion_status === 'converted' && preorder.converted_order_number ? (
                  <span className="text-green-700 font-medium">
                    {preorder.converted_order_number}
                  </span>
                ) : preorder.conversion_status === 'pending' && preorder.conversion_token ? (
                  <button
                    onClick={() => copyConversionUrl(preorder)}
                    className="text-xs text-[var(--color-brand-orange)] hover:underline"
                    title="Копирай линк за преобразуване"
                  >
                    {copiedId === preorder.id ? '✓ Копирано!' : '📋 Копирай линк'}
                  </button>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>

              {/* Date */}
              <td className="py-3 px-4 text-sm text-gray-500">
                {formatDateTimeShort(preorder.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
