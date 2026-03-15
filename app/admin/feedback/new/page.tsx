import { requireStaff } from '@/lib/auth';
import FeedbackFormBuilder from '@/components/admin/FeedbackFormBuilder';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Нов формуляр | Обратна връзка | FitFlow',
};

export default async function NewFeedbackFormPage() {
  await requireStaff(['super_admin', 'admin', 'marketing', 'content']);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Нов формуляр за обратна връзка
      </h1>
      <FeedbackFormBuilder />
    </div>
  );
}
