'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from './actions';
import { useAuthStore } from '@/store/authStore';

interface Props {
  initialName: string;
  initialPhone: string;
  email: string;
}

export default function EditProfileForm({ initialName, initialPhone, email }: Props) {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfile({ fullName, phone });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Update nav menu name immediately
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, fullName });
      }
      router.refresh(); // Refresh server data
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">Профилът е обновен</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Имейл</label>
        <input value={email} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500" />
        <p className="text-xs text-gray-400 mt-1">Имейлът не може да бъде променян</p>
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Име</label>
        <input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={100}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-[var(--color-brand-navy)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {saving ? 'Запазване...' : 'Запази промените'}
      </button>
    </form>
  );
}
