import { requireStaff } from '@/lib/auth';
import PreorderCampaignPage from '@/components/admin/PreorderCampaignPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Предпоръчки кампания | FitFlow Admin',
};

export default async function Page() {
  await requireStaff(['super_admin', 'admin', 'marketing']);
  return <PreorderCampaignPage />;
}
