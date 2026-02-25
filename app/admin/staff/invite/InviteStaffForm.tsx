'use client';

import { useState } from 'react';
import type { StaffRole } from '@/lib/supabase/types';
import { inviteStaff } from './actions';

/** All possible staff roles with display labels */
const ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: 'analyst', label: 'Анализатор' },
  { value: 'content', label: 'Съдържание' },
  { value: 'support', label: 'Поддръжка' },
  { value: 'finance', label: 'Финанси' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'marketing', label: 'Маркетинг' },
  { value: 'manager', label: 'Мениджър' },
  { value: 'admin', label: 'Администратор' },
];

interface Props {
  actorRole: StaffRole;
}

export default function InviteStaffForm({ actorRole }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<StaffRole>('support');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Filter roles: actor can only assign roles they outrank
  const availableRoles = ROLE_OPTIONS.filter(opt => {
    // super_admin can assign anything, admin can assign up to manager
    if (actorRole === 'super_admin') return true;
    if (actorRole === 'admin') return !['admin', 'super_admin'].includes(opt.value);
    return false;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await inviteStaff({ email, fullName, role });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setEmail('');
      setFullName('');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          Поканата е изпратена успешно!
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Имейл</label>
        <input
          id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required maxLength={254}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Пълно име</label>
        <input
          id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
          required maxLength={100}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Роля</label>
        <select
          id="role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        >
          {availableRoles.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit" disabled={loading}
        className="bg-[var(--color-brand-navy)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Изпращане...' : 'Изпрати покана'}
      </button>
    </form>
  );
}
