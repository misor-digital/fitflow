import { requireStaff } from '@/lib/auth';
import { getBrevoLists } from '@/lib/email/brevo/contacts';
import { EMAIL_CONFIG } from '@/lib/email/client';
import ContactListsTable from '@/components/admin/ContactListsTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакти | Администрация | FitFlow',
};

const EMAIL_ROLES = ['super_admin', 'admin', 'marketing', 'content'] as const;

export default async function ContactsPage() {
  await requireStaff([...EMAIL_ROLES]);

  // Fetch Brevo lists
  const { lists } = await getBrevoLists();

  // Map configured list IDs to their config keys
  const configuredIds: Record<number, string> = {};
  for (const [key, id] of Object.entries(EMAIL_CONFIG.lists)) {
    if (id) configuredIds[id] = key;
  }

  const enrichedLists = lists.map((list) => ({
    ...list,
    isConfigured: list.id in configuredIds,
    configKey: configuredIds[list.id] ?? null,
  }));

  // Totals for summary
  const totalContacts = lists.reduce((sum, l) => sum + l.totalSubscribers, 0);
  const configuredCount = enrichedLists.filter((l) => l.isConfigured).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Контакти & Листи
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            Brevo
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Lists */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">
                📋
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Общо листи</p>
                <p className="text-2xl font-bold text-gray-900">{lists.length}</p>
              </div>
            </div>
          </div>

          {/* Configured Lists */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">
                ✅
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Конфигурирани</p>
                <p className="text-2xl font-bold text-gray-900">{configuredCount}</p>
              </div>
            </div>
          </div>

          {/* Total Contacts */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">
                👥
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Общо контакти</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalContacts.toLocaleString('bg-BG')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lists Table */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Brevo Листи
        </h2>
        <ContactListsTable lists={enrichedLists} />
      </section>
    </div>
  );
}
