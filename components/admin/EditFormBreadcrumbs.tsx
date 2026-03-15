'use client';

import { useRouter } from 'next/navigation';

interface EditFormBreadcrumbsProps {
  formId: string;
  formTitle: string;
}

export default function EditFormBreadcrumbs({ formId, formTitle }: EditFormBreadcrumbsProps) {
  const router = useRouter();

  function navigateWithConfirm(dest: string) {
    const hasUnsaved = document.querySelector('[data-has-changes="true"]');
    if (hasUnsaved && !confirm('Ще загубите направените промени, ако се върнете сега.')) return;
    router.push(dest);
  }

  return (
    <div className="text-sm text-gray-500 mb-4">
      <button
        type="button"
        onClick={() => navigateWithConfirm('/admin/feedback')}
        className="hover:text-[var(--color-brand-orange)] cursor-pointer"
      >
        Формуляри
      </button>
      <span className="mx-2">→</span>
      <button
        type="button"
        onClick={() => navigateWithConfirm(`/admin/feedback/${formId}`)}
        className="hover:text-[var(--color-brand-orange)] cursor-pointer"
      >
        {formTitle}
      </button>
      <span className="mx-2">→</span>
      <span className="text-[var(--color-brand-navy)] font-medium">Редактиране</span>
    </div>
  );
}
