import { requireStaff } from '@/lib/auth';
import CampaignCreateWizard from '@/components/admin/CampaignCreateWizard';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Нова кампания | Администрация | FitFlow',
};

const CAMPAIGN_ROLES = ['super_admin', 'admin', 'content', 'marketing'] as const;

export default async function CreateCampaignPage() {
  await requireStaff([...CAMPAIGN_ROLES]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/campaigns"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Кампании
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          Нова кампания
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <CampaignCreateWizard />
      </div>
    </div>
  );
}
