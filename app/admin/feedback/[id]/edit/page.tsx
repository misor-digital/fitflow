import { requireStaff } from '@/lib/auth';
import { getFeedbackFormById } from '@/lib/data/feedback-forms';
import { notFound, redirect } from 'next/navigation';
import FeedbackFormBuilder from '@/components/admin/FeedbackFormBuilder';
import EditFormBreadcrumbs from '@/components/admin/EditFormBreadcrumbs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Редактиране на формуляр | FitFlow',
};

const EDIT_ROLES = ['super_admin', 'admin', 'marketing', 'content'] as const;

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function FeedbackFormEditPage({ params }: EditPageProps) {
  await requireStaff([...EDIT_ROLES]);

  const { id } = await params;
  const form = await getFeedbackFormById(id);
  if (!form) notFound();

  // Only allow editing inactive forms
  if (form.is_active) {
    redirect(`/admin/feedback/${id}`);
  }

  return (
    <div>
      <EditFormBreadcrumbs formId={id} formTitle={form.title} />

      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Редактиране: {form.title}
      </h1>

      <FeedbackFormBuilder initialForm={form} />
    </div>
  );
}
