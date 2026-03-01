import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth';
import {
  getOrdersByUser,
  getPreordersByUser,
  getBoxTypeNames,
  getEurToBgnRate,
  getOrderStatusHistory,
} from '@/lib/data';
import { OrdersList } from '@/components/account/OrdersList';
import type { Metadata } from 'next';
import type { OrderStatusHistoryRow } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Моите поръчки | FitFlow',
};

export default async function OrdersPage() {
  const { userId } = await requireAuth();

  // Fetch all data in parallel
  const [orders, preorders, boxTypeNames, eurToBgnRate] = await Promise.all([
    getOrdersByUser(userId),
    getPreordersByUser(userId),
    getBoxTypeNames(),
    getEurToBgnRate(),
  ]);

  // Batch-fetch status histories for all orders
  const historyEntries = await Promise.all(
    orders.map((o) => getOrderStatusHistory(o.id)),
  );
  const statusHistories: Record<string, OrderStatusHistoryRow[]> = {};
  orders.forEach((o, i) => {
    statusHistories[o.id] = historyEntries[i];
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Моите поръчки
      </h1>
      <Suspense fallback={null}>
        <OrdersList
          orders={orders}
          preorders={preorders}
          boxTypeNames={boxTypeNames}
          eurToBgnRate={eurToBgnRate}
          statusHistories={statusHistories}
        />
      </Suspense>
    </div>
  );
}
