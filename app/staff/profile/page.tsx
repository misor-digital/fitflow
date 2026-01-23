/**
 * Staff User Profile Page
 * View and edit user profile, change password, view activity
 * URL: /staff/profile
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
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
    assigned_at: string;
  }>;
}

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function StaffProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [error, setError] = useState('');
  
  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  // Change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Load profile
      const profileResponse = await fetch('/api/staff/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load profile');
      }

      const profileData = await profileResponse.json();
      setProfile(profileData.profile);
      setFullName(profileData.profile.full_name);

      // Load activity logs
      const activityResponse = await fetch(`/api/staff/profile/activity?page=${activityPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityLogs(activityData.logs);
        setActivityTotal(activityData.total);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Грешка при зареждане на профила');
      setLoading(false);
    }
  }, [router, activityPage]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setSavingProfile(true);

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);

      const response = await fetch('/api/staff/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName }),
      });

      if (!response.ok) {
        const data = await response.json();
        setProfileError(data.error || 'Грешка при запазване на профила');
        setSavingProfile(false);
        return;
      }

      setIsEditingProfile(false);
      checkAuthAndLoadData();
      setSavingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileError('Грешка при запазване на профила');
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    setSavingPassword(true);

    // Validate
    if (newPassword !== confirmPassword) {
      setPasswordError('Новата парола и потвърждението не съвпадат');
      setSavingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Паролата трябва да бъде поне 8 символа');
      setSavingPassword(false);
      return;
    }

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);

      const response = await fetch('/api/staff/profile/password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        setPasswordError(data.error || 'Грешка при смяна на паролата');
        setSavingPassword(false);
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      setSavingPassword(false);
      
      // Reload profile to update requires_password_reset flag
      checkAuthAndLoadData();
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Грешка при смяна на паролата');
      setSavingPassword(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Никога';
    return new Date(dateString).toLocaleString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Профилът не е намерен</p>
          <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800">
            Назад към таблото
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800">
              Табло
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Моят профил</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Моят профил</h1>
          <p className="text-sm text-gray-600">Управление на личния профил и настройки</p>
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

        {/* Password Reset Warning */}
        {profile.requires_password_reset && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ Необходимо е да смените паролата си при първо влизане
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Основна информация</h2>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    ✏️ Редактирай
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile}>
                  {profileError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">{profileError}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      Пълно име
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Имейл
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">Имейлът не може да бъде променен</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50"
                    >
                      {savingProfile ? 'Запазване...' : 'Запази'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setFullName(profile.full_name);
                        setProfileError('');
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Отказ
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Пълно име</p>
                    <p className="text-lg font-medium text-gray-900">{profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Имейл</p>
                    <p className="text-lg font-medium text-gray-900">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Последно влизане</p>
                    <p className="text-lg font-medium text-gray-900">{formatDate(profile.last_login_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Създаден на</p>
                    <p className="text-lg font-medium text-gray-900">{formatDate(profile.created_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Смяна на парола</h2>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    🔒 Смени парола
                  </button>
                )}
              </div>

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">✓ Паролата е сменена успешно</p>
                </div>
              )}

              {isChangingPassword ? (
                <form onSubmit={handleChangePassword}>
                  {passwordError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">{passwordError}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Текуща парола
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Нова парола
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                      required
                      minLength={8}
                    />
                    <p className="mt-1 text-xs text-gray-500">Минимум 8 символа</p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Потвърди нова парола
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-2 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50"
                    >
                      {savingPassword ? 'Смяна...' : 'Смени парола'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Отказ
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-gray-600">
                  Кликнете &quot;Смени парола&quot; за да промените текущата си парола
                </p>
              )}
            </div>

            {/* Activity Logs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Моята активност</h2>
              
              {activityLogs.length === 0 ? (
                <p className="text-center text-gray-600 py-8">Няма записана активност</p>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {log.action} - {log.resource_type}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ID: {log.resource_id}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activityTotal > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Показани {activityLogs.length} от {activityTotal} записа
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Roles Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Моите роли</h2>
              <div className="space-y-3">
                {profile.roles.map((role) => (
                  <div key={role.id} className="p-3 border border-purple-200 rounded-lg bg-purple-50">
                    <h4 className="font-semibold text-purple-900 text-sm mb-1">
                      {role.name.replace(/_/g, ' ').toUpperCase()}
                    </h4>
                    <p className="text-xs text-purple-700">{role.description}</p>
                    <p className="text-xs text-purple-600 mt-2">
                      Назначена: {formatDate(role.assigned_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Статус на акаунта</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Активен</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    profile.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {profile.is_active ? 'Да' : 'Не'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Изисква смяна на парола</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    profile.requires_password_reset
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {profile.requires_password_reset ? 'Да' : 'Не'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
