import { requireStaff } from '@/lib/auth';
import PromoCodeForm from '@/components/admin/PromoCodeForm';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Нов промо код | Администрация | FitFlow',
};

const PROMO_ROLES = ['super_admin', 'admin', 'marketing'] as const;

export default async function CreatePromoPage() {
  await requireStaff([...PROMO_ROLES]);

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
          Нов промо код
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <PromoCodeForm />
      </div>
    </div>
  );
}
