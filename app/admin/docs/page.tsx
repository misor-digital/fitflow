import { requireStaff } from '@/lib/auth';
import { getAdminDoc, getAllAdminDocsMeta, isValidAdminDocSlug } from '@/lib/admin-docs';
import { AdminDocsNav, AdminDocsContent } from '@/components/admin/AdminDocs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Документация | Администрация | FitFlow',
};

interface DocsPageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function AdminDocsPage({ searchParams }: DocsPageProps) {
  await requireStaff();

  const params = await searchParams;
  const allDocs = getAllAdminDocsMeta();
  const activeSlug = isValidAdminDocSlug(params.section ?? '') ? params.section! : 'getting-started';

  const doc = await getAdminDoc(activeSlug as Parameters<typeof getAdminDoc>[0]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        📖 Документация
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:sticky lg:top-6 lg:self-start">
          <AdminDocsNav items={allDocs} activeSlug={activeSlug} />
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 lg:p-8 min-w-0">
          <AdminDocsContent contentHtml={doc.contentHtml} />
        </div>
      </div>
    </div>
  );
}
