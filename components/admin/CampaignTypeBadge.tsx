import type { EmailCampaignTypeEnum } from '@/lib/supabase/types';

interface CampaignTypeBadgeProps {
  type: EmailCampaignTypeEnum;
}

const TYPE_CONFIG: Record<
  EmailCampaignTypeEnum,
  { label: string; icon: string; className: string }
> = {
  'preorder-conversion': {
    label: 'Предпоръчки',
    icon: '🔄',
    className: 'bg-purple-100 text-purple-800',
  },
  lifecycle: {
    label: 'Абонаменти',
    icon: '🔁',
    className: 'bg-indigo-100 text-indigo-800',
  },
  promotional: {
    label: 'Промоционална',
    icon: '📣',
    className: 'bg-pink-100 text-pink-800',
  },
  'one-off': {
    label: 'Известие',
    icon: '📨',
    className: 'bg-teal-100 text-teal-800',
  },
};

export default function CampaignTypeBadge({ type }: CampaignTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG['one-off'];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
