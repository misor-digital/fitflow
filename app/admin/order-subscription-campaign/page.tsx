import { requireStaff } from '@/lib/auth';
import OrderSubscriptionCampaignPage from '@/components/admin/OrderSubscriptionCampaignPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Конверсия поръчка → абонамент | FitFlow Admin',
};

export default async function Page() {
  await requireStaff(['super_admin', 'admin', 'marketing']);
  return <OrderSubscriptionCampaignPage />;
}
