/**
 * Staff Dashboard Page
 * Role-based dashboard for staff users
 * URL: /staff/dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [state, setState] = useState<{
    loading: boolean;
    staffUser: StaffUser | null;
  }>({
    loading: true,
    staffUser: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get session from localStorage
        const sessionData = localStorage.getItem('supabase.auth.token');
        if (!sessionData) {
          router.push('/staff/login');
          return;
        }

        const session = JSON.parse(sessionData);
        
        // Call API to get staff data
        const response = await fetch('/api/staff/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }

        const data = await response.json();
        
        setState({
          loading: false,
          staffUser: data.staffUser,
        });
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('supabase.auth.token');
        router.push('/staff/login');
      }
    };

    checkAuth();
  }, [router]);

  const { loading, staffUser } = state;

  const handleLogout = async () => {
    localStorage.removeItem('supabase.auth.token');
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
              <Link
                href="/staff/profile"
                className="text-right hover:bg-gray-50 px-3 py-2 rounded-lg transition"
              >
                <p className="text-sm font-medium text-gray-900">{staffUser?.full_name}</p>
                <p className="text-xs text-gray-500">{staffUser?.email}</p>
              </Link>
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
          {(hasRole('catalog_manager') || hasRole('admin_ops') || hasRole('super_admin')) && (
            <DashboardCard
              title="Каталог"
              description="Управление на продукти и опции"
              icon="🏷️"
              href="/staff/catalog/box-types"
              color="indigo"
            />
          )}

          {/* Finance */}
          {(hasRole('finance') || hasRole('admin_ops') || hasRole('super_admin')) && (
            <>
              <DashboardCard
                title="Приходи"
                description="Анализ на приходите"
                icon="💰"
                href="/staff/analytics/revenue"
                color="green"
              />
              <DashboardCard
                title="Поръчки"
                description="Анализ на поръчките"
                icon="📊"
                href="/staff/analytics/orders"
                color="blue"
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
          {(hasRole('developer') || hasRole('admin_ops') || hasRole('super_admin')) && (
            <DashboardCard
              title="Система"
              description="Системно здраве и логове"
              icon="⚙️"
              href="/staff/system/health"
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
