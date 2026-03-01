import { requireAuth } from '@/lib/auth';
import {
  getOrdersByUser,
  getPreordersByUser,
  getBoxTypeNames,
  getEurToBgnRate,
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Моите поръчки
      </h1>
      <OrdersList
        orders={orders}
        preorders={preorders}
        boxTypeNames={boxTypeNames}
        eurToBgnRate={eurToBgnRate}
      />
    </div>
  );
}
