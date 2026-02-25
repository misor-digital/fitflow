import type { EmailCampaignStatusEnum } from '@/lib/supabase/types';

interface CampaignStatusBadgeProps {
  status: EmailCampaignStatusEnum;
}

const STATUS_CONFIG: Record<
  EmailCampaignStatusEnum,
  { label: string; className: string; pulse?: boolean }
> = {
  draft: { label: 'Чернова', className: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Планирана', className: 'bg-blue-100 text-blue-800' },
  sending: {
    label: 'Изпращане',
    className: 'bg-yellow-100 text-yellow-800',
    pulse: true,
  },
  paused: { label: 'Паузирана', className: 'bg-orange-100 text-orange-800' },
  sent: { label: 'Изпратена', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Отказана', className: 'bg-red-100 text-red-800' },
  failed: { label: 'Неуспешна', className: 'bg-red-200 text-red-900' },
};

export default function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}
