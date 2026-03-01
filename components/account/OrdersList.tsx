'use client';

import type { OrderRow, Preorder } from '@/lib/supabase/types';

interface OrdersListProps {
  orders: OrderRow[];
  preorders: Preorder[];
  boxTypeNames: Record<string, string>;
  eurToBgnRate: number;
}

export function OrdersList({
  orders,
  preorders,
  boxTypeNames,
  eurToBgnRate,
}: OrdersListProps) {
  const totalCount = orders.length + preorders.length;

  if (totalCount === 0) {
    return (
      <p className="text-gray-500 text-center py-12">
        Все още нямате поръчки.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {totalCount} {totalCount === 1 ? 'поръчка' : 'поръчки'}
      </p>
      {/* TODO: Step 10 — implement order type filters and order cards */}
      <pre className="hidden">
        {JSON.stringify({ boxTypeNames, eurToBgnRate }, null, 2)}
      </pre>
    </div>
  );
}
