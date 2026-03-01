'use client';

interface TimelineEvent {
  key: string;
  label: string;
  date: string;
  type: 'completed' | 'active' | 'paused' | 'cancelled' | 'future' | 'ellipsis';
}

interface SubscriptionTimelineProps {
  createdAt: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  pastOrders: Array<{ order_number: string; created_at: string; status: string }> | null;
  pausedAt: string | null;
  cancelledAt: string | null;
  nextDeliveryDate: string | null;
  onLoadOrders: () => void;
  loadingOrders: boolean;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

function buildEvents(props: SubscriptionTimelineProps): TimelineEvent[] {
  const { createdAt, status, pastOrders, pausedAt, cancelledAt, nextDeliveryDate } = props;
  const events: TimelineEvent[] = [];

  // 1 — Created
  events.push({ key: 'created', label: 'Създ.', date: shortDate(createdAt), type: 'completed' });

  // 2 — Delivered cycles from past orders
  if (pastOrders && pastOrders.length > 0) {
    const sorted = [...pastOrders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const MAX_DELIVERY_DOTS = 4;
    if (sorted.length <= MAX_DELIVERY_DOTS) {
      sorted.forEach((o, i) => {
        events.push({
          key: `order-${o.order_number}`,
          label: `Дост. ${i + 1}`,
          date: shortDate(o.created_at),
          type: 'completed',
        });
      });
    } else {
      // Show ellipsis then last 4
      const skipped = sorted.length - MAX_DELIVERY_DOTS;
      events.push({
        key: 'ellipsis',
        label: `+${skipped}`,
        date: '',
        type: 'ellipsis',
      });
      sorted.slice(-MAX_DELIVERY_DOTS).forEach((o, i) => {
        events.push({
          key: `order-${o.order_number}`,
          label: `Дост. ${skipped + i + 1}`,
          date: shortDate(o.created_at),
          type: 'completed',
        });
      });
    }
  }

  // 3 — Paused
  if (pausedAt && status === 'paused') {
    events.push({ key: 'paused', label: 'Пауза', date: shortDate(pausedAt), type: 'paused' });
  }

  // 4 — Cancelled
  if (cancelledAt && (status === 'cancelled' || status === 'expired')) {
    events.push({ key: 'cancelled', label: 'Отказан', date: shortDate(cancelledAt), type: 'cancelled' });
  }

  // 5 — Next delivery (future)
  if (status === 'active' && nextDeliveryDate) {
    events.push({ key: 'next', label: 'Следв.', date: shortDate(nextDeliveryDate), type: 'future' });
  }

  return events;
}

const DOT_STYLES: Record<TimelineEvent['type'], string> = {
  completed: 'bg-green-500',
  active: 'bg-[var(--color-brand-orange)] ring-2 ring-orange-200',
  paused: 'bg-yellow-500',
  cancelled: 'bg-red-500',
  future: 'border-2 border-dashed border-gray-300 bg-white',
  ellipsis: '',
};

export default function SubscriptionTimeline(props: SubscriptionTimelineProps) {
  const { pastOrders, onLoadOrders, loadingOrders } = props;
  const events = buildEvents(props);

  // If orders aren't loaded yet, show a prompt to load them for the timeline
  if (pastOrders === null) {
    return (
      <div className="flex items-center justify-center py-3">
        <button
          type="button"
          onClick={onLoadOrders}
          disabled={loadingOrders}
          className="text-xs text-[var(--color-brand-orange)] hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2 rounded"
        >
          {loadingOrders ? 'Зареждане…' : 'Зареди хронология'}
        </button>
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="overflow-x-auto py-3">
      <div className="flex items-start gap-0 min-w-max px-2" role="list" aria-label="Хронология на абонамент">
        {events.map((event, idx) => {
          const isLast = idx === events.length - 1;
          const isEllipsis = event.type === 'ellipsis';

          return (
            <div key={event.key} className="flex items-start" role="listitem">
              {/* Dot + label column */}
              <div className="flex flex-col items-center" style={{ minWidth: '3rem' }}>
                {isEllipsis ? (
                  <span className="text-xs font-bold text-gray-400 leading-3">···</span>
                ) : (
                  <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${DOT_STYLES[event.type]}`}
                  />
                )}
                <span className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">{event.label}</span>
                {event.date && (
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{event.date}</span>
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex items-center self-[6px] pt-[5px]">
                  <div
                    className={`h-0.5 w-6 ${
                      event.type === 'completed' || event.type === 'active'
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
