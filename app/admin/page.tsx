import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSubscriptionsCount, getSubscriptionMRR } from '@/lib/data';

export const metadata = {
  title: 'Табло | FitFlow Admin',
};

export default async function AdminDashboard() {
  const session = await requireStaff();

  // Basic stats
  const [orderCount, staffCount, subscriptionCounts, mrr] = await Promise.all([
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'staff'),
    getSubscriptionsCount(),
    getSubscriptionMRR(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Добре дошли, {session.profile.full_name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Общо поръчки</p>
          <p className="text-3xl font-bold text-[var(--color-brand-navy)]">
            {orderCount.count ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Служители</p>
          <p className="text-3xl font-bold text-[var(--color-brand-navy)]">
            {staffCount.count ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Ваша роля</p>
          <p className="text-3xl font-bold text-[var(--color-brand-orange)] capitalize">
            {session.profile.staff_role?.replace('_', ' ')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">🔄 Активни абонаменти</p>
          <p className="text-3xl font-bold text-green-700">
            {subscriptionCounts.active}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">💰 MRR</p>
          <p className="text-3xl font-bold text-[var(--color-brand-navy)]">
            €{mrr.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Placeholder for charts, recent orders, etc. */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-400 text-center py-12">
          Детайлни статистики — очаквайте скоро
        </p>
      </div>
    </div>
  );
}
