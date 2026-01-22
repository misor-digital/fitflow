/**
 * Staff Users Management Page
 * Create and manage staff users (super_admin only)
 * URL: /staff/users
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StaffUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  requires_password_reset: boolean;
  last_login_at: string | null;
  created_at: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

const AVAILABLE_ROLES = [
  { name: 'super_admin', label: 'Super Admin', description: 'Пълен достъп до системата' },
  { name: 'admin_ops', label: 'Admin Operations', description: 'Оперативен администратор' },
  { name: 'catalog_manager', label: 'Catalog Manager', description: 'Управление на каталога' },
  { name: 'marketing_manager', label: 'Marketing Manager', description: 'Маркетинг мениджър' },
  { name: 'marketing_operator', label: 'Marketing Operator', description: 'Маркетинг оператор' },
  { name: 'customer_support', label: 'Customer Support', description: 'Клиентска поддръжка' },
];

export default function StaffUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    checkAuthAndLoadUsers();
  }, []);

  const checkAuthAndLoadUsers = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Note: We would need a list endpoint for staff users
      // For now, we'll just show the create form
      setLoading(false);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Грешка при зареждане на потребителите');
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Validate
      if (!email.trim() || !fullName.trim() || selectedRoles.length === 0) {
        setError('Всички полета са задължителни и трябва да изберете поне една роля');
        setCreating(false);
        return;
      }

      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          roleNames: selectedRoles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при създаване на потребител');
        setCreating(false);
        return;
      }

      // Success
      alert(`Потребителят ${fullName} е създаден успешно! Изпратен е имейл за активация.`);
      
      // Reset form
      setEmail('');
      setFullName('');
      setSelectedRoles([]);
      setShowCreateForm(false);
      setCreating(false);
      
      // Reload users list
      checkAuthAndLoadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Грешка при създаване на потребител');
      setCreating(false);
    }
  };

  const toggleRole = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleName));
    } else {
      setSelectedRoles([...selectedRoles, roleName]);
    }
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
              <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
                ← Назад към таблото
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Управление на персонал</h1>
              <p className="text-sm text-gray-600">Създаване и управление на служители (само за super_admin)</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
            >
              {showCreateForm ? 'Отказ' : '+ Създай потребител'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Създаване на нов служител</h2>
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Имейл адрес *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="служител@fitflow.bg"
                  required
                  disabled={creating}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Имейлът ще се използва за вход в системата
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Пълно име *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Иван Иванов"
                  required
                  disabled={creating}
                />
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Роли * (изберете поне една)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AVAILABLE_ROLES.map((role) => (
                    <div
                      key={role.name}
                      onClick={() => !creating && toggleRole(role.name)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedRoles.includes(role.name)
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${creating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.name)}
                          onChange={() => {}}
                          className="mt-1"
                          disabled={creating}
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{role.label}</p>
                          <p className="text-sm text-gray-600">{role.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 font-semibold mb-1">
                      Как работи процесът?
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Потребителят ще получи имейл с линк за активация</li>
                      <li>• Линкът е валиден 24 часа</li>
                      <li>• При активация потребителят ще зададе своя парола</li>
                      <li>• След това може да влезе в системата с имейл и парола</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {creating ? 'Създаване...' : '👤 Създай потребител'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-semibold"
                >
                  Отказ
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ℹ️ Информация за ролите</h2>
          <div className="space-y-4">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-gray-900">{role.label}</p>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-red-800 font-semibold mb-1">
                🔒 Важно за сигурността
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Само super_admin може да създава нови потребители</li>
                <li>• Внимавайте при даване на super_admin права</li>
                <li>• Редовно преглеждайте активните потребители</li>
                <li>• Деактивирайте потребители, които вече не работят в компанията</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
