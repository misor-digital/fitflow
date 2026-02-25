import { requireStaff } from '@/lib/auth';
import { getCampaignById, getCampaignHistory, getRecipientStats, getRecipientsPaginated } from '@/lib/data';
import { getCampaignUnsubscribeCount } from '@/lib/email/unsubscribe';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CampaignDetailView from '@/components/admin/CampaignDetailView';
import type { Metadata } from 'next';

const CAMPAIGN_ROLES = ['super_admin', 'admin', 'content', 'marketing'] as const;
const RECIPIENTS_PER_PAGE = 20;

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rPage?: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  return {
    title: campaign
      ? `${campaign.name} | Кампании | FitFlow`
      : 'Кампания | FitFlow',
  };
}

export default async function CampaignDetailPage({ params, searchParams }: CampaignDetailPageProps) {
  await requireStaff([...CAMPAIGN_ROLES]);

  const { id } = await params;
  const sp = await searchParams;
  const rPage = Math.max(1, parseInt(sp.rPage ?? '1', 10) || 1);

  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [recipientStats, { recipients, total: recipientsTotal }, history, unsubscribeCount] = await Promise.all([
    getRecipientStats(campaign.id),
    getRecipientsPaginated(campaign.id, rPage, RECIPIENTS_PER_PAGE),
    getCampaignHistory(campaign.id),
    getCampaignUnsubscribeCount(campaign.id),
  ]);

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
        <span className="text-sm text-gray-700 font-medium truncate max-w-[300px]">
          {campaign.name}
        </span>
      </div>

      <CampaignDetailView
        campaign={campaign}
        recipientStats={recipientStats}
        recipients={recipients}
        recipientsTotal={recipientsTotal}
        recipientsPage={rPage}
        recipientsPerPage={RECIPIENTS_PER_PAGE}
        history={history}
        unsubscribeCount={unsubscribeCount}
      />
    </div>
  );
}
