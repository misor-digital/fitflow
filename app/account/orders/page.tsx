import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth';
import {
  getOrdersByUser,
  getPreordersByUser,
  getBoxTypeNames,
  getEurToBgnRate,
  getOrderStatusHistoryBatch,
} from '@/lib/data';
import { OrdersList } from '@/components/account/OrdersList';
import type { Metadata } from 'next';

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

  // Batch-fetch status histories for all orders in a single query
  const statusHistories = orders.length > 0
    ? await getOrderStatusHistoryBatch(orders.map((o) => o.id))
    : {};

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
