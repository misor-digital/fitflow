'use client';

import type { FeedbackResponseRow, FeedbackFieldDefinition } from '@/lib/supabase/types';

interface Props {
  responses: FeedbackResponseRow[];
  fields: FeedbackFieldDefinition[];
}

function renderAnswer(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—';

  switch (type) {
    case 'rating':
      return '★'.repeat(value as number) + '☆'.repeat(Math.max(0, 5 - (value as number)));
    case 'nps':
      return String(value);
    case 'boolean':
      return value ? 'Да' : 'Не';
    case 'multi_select':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
}

export default function FeedbackResponsesTable({ responses, fields }: Props) {
  if (responses.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Все още няма отговори.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-left">
          <tr>
            <th className="px-3 py-2 font-medium text-xs">#</th>
            {fields.map(f => (
              <th key={f.id} className="px-3 py-2 font-medium text-xs max-w-[200px] truncate">
                {f.label}
              </th>
            ))}
            <th className="px-3 py-2 font-medium text-xs">Дата</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {responses.map((response, i) => (
            <tr key={response.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
              {fields.map(f => (
                <td key={f.id} className="px-3 py-2 max-w-[200px] truncate" title={String(response.answers[f.id] ?? '')}>
                  {renderAnswer(response.answers[f.id], f.type)}
                </td>
              ))}
              <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                {new Date(response.created_at).toLocaleString('bg-BG')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
