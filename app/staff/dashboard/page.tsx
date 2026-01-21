/**
 * Staff Dashboard Page
 * Role-based dashboard for staff users
 * URL: /staff/dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface StaffUser {
  full_name: string;
  email: string;
  roles: Array<{
    name: string;
    description: string;
  }>;
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/staff/login');
        return;
      }

      // Get staff user with roles
      const { data: staff } = await supabase
        .from('staff_users')
        .select(`
          id,
          full_name,
          email,
          is_active
        `)
        .eq('user_id', user.id)
        .single();

      if (!staff || !staff.is_active) {
        await supabase.auth.signOut();
        router.push('/staff/login');
        return;
      }

      // Get roles
      const { data: roleAssignments } = await supabase
        .from('staff_role_assignments')
        .select(`
          roles (
            name,
            description
          )
        `)
        .eq('staff_user_id', staff.id);

      const roles = (roleAssignments || []).map((assignment: any) => ({
        name: assignment.roles.name,
        description: assignment.roles.description,
      }));

      setStaffUser({
        full_name: staff.full_name,
        email: staff.email,
        roles,
      });
      setLoading(false);
    } catch (err) {
      console.error('Auth error:', err);
      router.push('/staff/login');
    }
  };

  const handleLogout = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/staff/login');
  };

  const hasRole = (roleName: string) => {
    return staffUser?.roles.some(r => r.name === roleName) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FitFlow</h1>
              <p className="text-sm text-gray-600">Вътрешна система</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{staffUser?.full_name}</p>
                <p className="text-xs text-gray-500">{staffUser?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Изход
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Добре дошъл/дошла, {staffUser?.full_name}! 👋
          </h2>
          <p className="text-purple-100">
            Това е твоят служебен панел. Избери секция от менюто по-долу.
          </p>
        </div>

        {/* Roles Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Твоите роли</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffUser?.roles.map((role) => (
              <div
                key={role.name}
                className="p-4 border border-purple-200 rounded-lg bg-purple-50"
              >
                <h4 className="font-semibold text-purple-900 mb-1">
                  {role.name.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <p className="text-sm text-purple-700">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Super Admin / Admin Ops */}
          {(hasRole('super_admin') || hasRole('admin_ops')) && (
            <>
              <DashboardCard
                title="Поръчки"
                description="Управление на предварителни поръчки"
                icon="📦"
                href="/staff/preorders"
                color="blue"
              />
              <DashboardCard
                title="Клиенти"
                description="Управление на клиентски акаунти"
                icon="👥"
                href="/staff/customers"
                color="green"
              />
            </>
          )}

          {/* Super Admin Only */}
          {hasRole('super_admin') && (
            <DashboardCard
              title="Служители"
              description="Управление на служебни акаунти"
              icon="👨‍💼"
              href="/staff/users"
              color="purple"
            />
          )}

          {/* Marketing */}
          {(hasRole('marketing_manager') || hasRole('marketing_operator')) && (
            <>
              <DashboardCard
                title="Абонати"
                description="Управление на бюлетин абонати"
                icon="📧"
                href="/staff/subscribers"
                color="yellow"
              />
              <DashboardCard
                title="Кампании"
                description="Имейл маркетинг кампании"
                icon="📊"
                href="/staff/campaigns"
                color="orange"
              />
            </>
          )}

          {/* Catalog Manager */}
          {hasRole('catalog_manager') && (
            <DashboardCard
              title="Каталог"
              description="Управление на продукти и опции"
              icon="🏷️"
              href="/staff/catalog"
              color="indigo"
            />
          )}

          {/* Finance */}
          {hasRole('finance') && (
            <>
              <DashboardCard
                title="Финанси"
                description="Приходи и аналитика"
                icon="💰"
                href="/staff/analytics"
                color="green"
              />
              <DashboardCard
                title="Промо кодове"
                description="Управление на промоционални кодове"
                icon="🎟️"
                href="/staff/promo-codes"
                color="pink"
              />
            </>
          )}

          {/* Developer */}
          {hasRole('developer') && (
            <DashboardCard
              title="Система"
              description="Системно здраве и логове"
              icon="⚙️"
              href="/staff/system"
              color="gray"
            />
          )}

          {/* Audit Logs (Super Admin / Admin Ops) */}
          {(hasRole('super_admin') || hasRole('admin_ops')) && (
            <DashboardCard
              title="Одит логове"
              description="Преглед на системни действия"
              icon="📋"
              href="/staff/audit-logs"
              color="red"
            />
          )}
        </div>

        {/* Info Notice */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Забележка:</strong> Някои секции са в процес на разработка (Phase 3). 
            Основните функции за управление на поръчки и абонати са достъпни.
          </p>
        </div>
      </main>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

function DashboardCard({ title, description, icon, href, color }: DashboardCardProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    green: 'border-green-200 bg-green-50 hover:bg-green-100',
    purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
    yellow: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
    orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
    indigo: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
    pink: 'border-pink-200 bg-pink-50 hover:bg-pink-100',
    gray: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
    red: 'border-red-200 bg-red-50 hover:bg-red-100',
  };

  return (
    <a
      href={href}
      className={`block p-6 border rounded-lg transition ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
