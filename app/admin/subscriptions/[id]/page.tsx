import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import {
  getSubscriptionById,
  getSubscriptionHistory,
  getOrdersBySubscription,
  getBoxTypeNames,
  getAddressById,
} from '@/lib/data';
import { computeSubscriptionState, FREQUENCY_LABELS } from '@/lib/subscription';
import { SubscriptionDetailView } from '@/components/admin/SubscriptionDetailView';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sub = await getSubscriptionById(id);
  return {
    title: sub
      ? `Абонамент | Администрация | FitFlow`
      : 'Абонамент не е намерен | Администрация | FitFlow',
  };
}

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff([...ORDER_VIEW_ROLES]);
  const { id } = await params;

  const subscription = await getSubscriptionById(id);
  if (!subscription) notFound();

  const [history, linkedOrders, boxTypeNames, address] = await Promise.all([
    getSubscriptionHistory(id),
    getOrdersBySubscription(id),
    getBoxTypeNames(),
    subscription.default_address_id
      ? getAddressById(subscription.default_address_id, subscription.user_id)
      : Promise.resolve(null),
  ]);

  const derivedState = computeSubscriptionState(subscription);
  const boxTypeName = boxTypeNames[subscription.box_type] ?? subscription.box_type;

  // Determine if current admin can manage (execute actions)
  const canManage = session.profile.staff_role
    ? STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    : false;

  // Fetch user info for display
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  const [profileResult, authResult] = await Promise.all([
    supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('id', subscription.user_id)
      .single(),
    supabaseAdmin.auth.admin.getUserById(subscription.user_id),
  ]);

  const userName = profileResult.data?.full_name ?? 'Неизвестен';
  const userEmail = authResult.data?.user?.email ?? '';

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/subscriptions" className="text-sm text-gray-500 hover:text-gray-700">
          ← Назад към абонаменти
        </Link>
      </div>

      <SubscriptionDetailView
        subscription={subscription}
        derivedState={derivedState}
        history={history}
        linkedOrders={linkedOrders}
        boxTypeName={boxTypeName}
        defaultAddress={address}
        canManage={canManage}
        userName={userName}
        userEmail={userEmail}
      />
    </div>
  );
}
