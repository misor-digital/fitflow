import { requireStaff } from '@/lib/auth';
import { getPromoCodeById } from '@/lib/data';
import PromoCodeForm from '@/components/admin/PromoCodeForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Редактиране на промо код | Администрация | FitFlow',
};

const PROMO_ROLES = ['super_admin', 'admin', 'marketing'] as const;

interface EditPromoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromoPage({ params }: EditPromoPageProps) {
  await requireStaff([...PROMO_ROLES]);

  const { id } = await params;
  const promo = await getPromoCodeById(id);

  if (!promo) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/promo"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Промо кодове
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          Редактиране: <span className="font-mono">{promo.code}</span>
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <PromoCodeForm
          initialData={{
            id: promo.id,
            code: promo.code,
            discount_percent: promo.discount_percent,
            description: promo.description,
            is_enabled: promo.is_enabled,
            starts_at: promo.starts_at,
            ends_at: promo.ends_at,
            max_uses: promo.max_uses,
            max_uses_per_user: promo.max_uses_per_user,
          }}
        />
      </div>

      {/* Usage stats section */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Статистики
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Общо използвания</div>
            <div className="text-xl font-bold">{promo.current_uses}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Максимално (общо)</div>
            <div className="text-xl font-bold">{promo.max_uses ?? '∞'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Макс. на потребител</div>
            <div className="text-xl font-bold">
              {promo.max_uses_per_user ?? '∞'}
            </div>
          </div>
        </div>

        {promo.current_uses > 0 && (
          <p className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            ⚠️ Този промо код е бил използван {promo.current_uses} пъти.
            Промяната на кода или отстъпката няма да засегне вече създадени
            поръчки.
          </p>
        )}
      </div>
    </div>
  );
}
