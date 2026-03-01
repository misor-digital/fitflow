'use client';

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  STATUS_ORDER,
  STATUS_BG_COLORS,
} from '@/lib/order';
import type { OrderStatus } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'току-що';
  if (diffMinutes < 60) return `преди ${diffMinutes} мин.`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `преди ${diffHours} ч.`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'преди 1 ден';
  if (diffDays <= 30) return `преди ${diffDays} дни`;
  if (diffDays <= 364) return `преди ${Math.floor(diffDays / 30)} мес.`;

  return `преди ${Math.floor(diffDays / 365)} г.`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  notes: string | null;
  createdAt: string;
}

export interface StatusTimelineProps {
  statusHistory: StatusHistoryEntry[];
  currentStatus: OrderStatus;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusTimeline({ statusHistory, currentStatus }: StatusTimelineProps) {
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'refunded';

  return (
    <div className="relative">
      {/* Completed steps from history */}
      {statusHistory.map((entry, i) => {
        const isLast = i === statusHistory.length - 1;
        const statusColor = ORDER_STATUS_COLORS[entry.toStatus];

        return (
          <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {(!isLast || (!isCancelled && currentStatusIndex >= 0 && currentStatusIndex < STATUS_ORDER.length - 1)) && (
              <div className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Timeline dot */}
            <div className="relative flex-shrink-0">
              {isLast ? (
                <div
                  className={`w-6 h-6 rounded-full border-2 ${statusColor.replace('text-', 'border-')} ${STATUS_BG_COLORS[entry.toStatus]} flex items-center justify-center`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${statusColor.replace('text-', 'bg-')}`}
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Timeline content */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold text-sm ${isLast ? statusColor : 'text-gray-700'}`}
              >
                {ORDER_STATUS_LABELS[entry.toStatus]}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(entry.createdAt).toLocaleDateString('bg-BG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <span className="text-gray-400">
                  {' · '}
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </p>
              {entry.notes && (
                <p className="text-xs text-gray-500 mt-1 italic">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Future statuses (grayed out) — only if not cancelled/refunded */}
      {!isCancelled &&
        currentStatusIndex >= 0 &&
        currentStatusIndex < STATUS_ORDER.length - 1 && (
          <div className="mt-2">
            {STATUS_ORDER.slice(currentStatusIndex + 1).map((futureStatus, i) => (
              <div key={futureStatus} className="relative flex gap-4 pb-6 last:pb-0">
                {i < STATUS_ORDER.length - currentStatusIndex - 2 && (
                  <div className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-gray-100" />
                )}
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 bg-gray-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-300">
                    {ORDER_STATUS_LABELS[futureStatus]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
