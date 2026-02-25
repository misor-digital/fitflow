'use client';

import { useState } from 'react';
import type { EmailCampaignHistoryRow } from '@/lib/supabase/types';

interface CampaignHistoryTimelineProps {
  history: EmailCampaignHistoryRow[];
}

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  created: { icon: '🟢', label: 'Създадена', color: 'border-green-400' },
  started: { icon: '🔵', label: 'Стартирана', color: 'border-blue-400' },
  paused: { icon: '⏸️', label: 'Паузирана', color: 'border-orange-400' },
  resumed: { icon: '▶️', label: 'Продължена', color: 'border-blue-400' },
  completed: { icon: '✅', label: 'Завършена', color: 'border-green-500' },
  cancelled: { icon: '🔴', label: 'Отказана', color: 'border-red-400' },
  failed: { icon: '❌', label: 'Неуспешна', color: 'border-red-500' },
  updated: { icon: '✏️', label: 'Редактирана', color: 'border-gray-400' },
  'send-test': { icon: '🧪', label: 'Тестов имейл', color: 'border-purple-400' },
  deleted: { icon: '🗑️', label: 'Изтрита', color: 'border-red-400' },
};

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTimestamp(dateStr: string): string {
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
  return formatTimestamp(dateStr);
}

export default function CampaignHistoryTimeline({ history }: CampaignHistoryTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Display most recent first
  const sorted = [...history].reverse();

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Няма записана история.</p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-6">
        {sorted.map((entry) => {
          const config = ACTION_CONFIG[entry.action] ?? {
            icon: '📋',
            label: entry.action,
            color: 'border-gray-300',
          };
          const isExpanded = expandedId === entry.id;
          const hasMeta =
            entry.metadata && Object.keys(entry.metadata).length > 0;

          return (
            <div key={entry.id} className="relative pl-10">
              {/* Dot */}
              <div
                className={`absolute left-2 top-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center text-xs ${config.color}`}
              >
                <span className="text-[10px]">{config.icon}</span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--color-brand-navy)]">
                    {config.label}
                  </span>
                  <span
                    className="text-xs text-gray-400"
                    title={formatTimestamp(entry.created_at)}
                  >
                    {relativeTimestamp(entry.created_at)}
                  </span>
                </div>

                {entry.notes && (
                  <p className="text-sm text-gray-600 mt-0.5">{entry.notes}</p>
                )}

                {hasMeta && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                  >
                    {isExpanded ? 'Скрий детайли ▲' : 'Покажи детайли ▼'}
                  </button>
                )}

                {isExpanded && hasMeta && (
                  <pre className="mt-2 text-xs bg-gray-50 text-gray-600 rounded-lg p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
