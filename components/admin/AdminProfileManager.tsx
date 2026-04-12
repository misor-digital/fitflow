'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isValidPhone, getPhoneError } from '@/lib/catalog';

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  userType: string;
  staffRole: string | null;
  isSubscriber: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminProfileManagerProps {
  profile: ProfileData;
  canManage: boolean;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AdminProfileManager({ profile, canManage }: AdminProfileManagerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  useEffect(() => {
    if (isEditing && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isEditing]);

  const openEdit = useCallback(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone);
    setFieldErrors({});
    setError(null);
    setIsEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setFieldErrors({});
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'Името е задължително.';
    if (!lastName.trim()) errors.lastName = 'Фамилията е задължителна.';
    if (!phone.trim()) {
      errors.phone = 'Телефонът е задължителен.';
    } else {
      const phoneErr = getPhoneError(phone);
      if (phoneErr) errors.phone = phoneErr;
      else if (!isValidPhone(phone)) errors.phone = 'Невалиден телефонен номер.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customer/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Грешка при обновяване.');
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError('Грешка при свързване със сървъра.');
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, phone, profile.id, router]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customer/${profile.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Грешка при изтриване.');
        setConfirmDelete(false);
        return;
      }

      router.push('/admin/customers');
    } catch {
      setError('Грешка при свързване със сървъра.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }, [profile.id, router]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          {profile.firstName} {profile.lastName}
        </h1>
        {canManage && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="px-3 py-1.5 text-sm font-medium text-[var(--color-brand-navy)] border border-[var(--color-brand-navy)] rounded-lg hover:bg-[var(--color-brand-navy)] hover:text-white transition-colors"
            >
              Редактирай
            </button>
            {profile.userType !== 'staff' && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Изтрий
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-sm text-red-800 font-medium mb-3">
            Сигурни ли сте, че искате да изтриете акаунта на {profile.firstName} {profile.lastName}? Това действие е необратимо.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {deleting && <Spinner />}
              Да, изтрий
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Отказ
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {isEditing ? (
        <div ref={formRef}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Име *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] ${
                  fieldErrors.firstName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] ${
                  fieldErrors.lastName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)] ${
                  fieldErrors.phone ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имейл</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-navy)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Spinner />}
              Запази
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Отказ
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Read-only display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
            <p><span className="font-medium text-gray-700">Имейл:</span> {profile.email}</p>
            <p><span className="font-medium text-gray-700">Телефон:</span> {profile.phone || '—'}</p>
            <p><span className="font-medium text-gray-700">Тип:</span> {profile.userType === 'staff' ? 'Персонал' : 'Клиент'}</p>
            {profile.userType === 'staff' && profile.staffRole && (
              <p><span className="font-medium text-gray-700">Роля:</span> {profile.staffRole}</p>
            )}
            <p><span className="font-medium text-gray-700">Регистрация:</span> {profile.createdAt}</p>
            <p><span className="font-medium text-gray-700">Последна промяна:</span> {profile.updatedAt}</p>
            <p className="sm:col-span-2"><span className="font-medium text-gray-700">ID:</span> <span className="font-mono text-xs text-gray-400">{profile.id}</span></p>
          </div>
        </>
      )}
    </div>
  );
}
