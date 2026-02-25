'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { validatePassword } from '@/lib/auth/passwordPolicy';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const validationErrors = useMemo(
    () => (newPassword ? validatePassword(newPassword).errors : []),
    [newPassword],
  );

  // Check if user has an existing password
  useEffect(() => {
    const controller = new AbortController();

    async function checkPassword() {
      try {
        const res = await fetch('/api/auth/has-password', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setHasPassword(data.hasPassword);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error checking password status:', err);
        // Default to requiring current password
        setHasPassword(true);
      }
    }

    checkPassword();
    return () => controller.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError('Паролата не отговаря на изискванията');
      setSaving(false);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError('Паролите не съвпадат');
      setSaving(false);
      return;
    }

    const supabase = createClient();

    // If user has a password, verify current password first
    if (hasPassword && currentPassword) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError('Грешка при проверка на акаунта');
        setSaving(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError('Текущата парола е грешна');
        setSaving(false);
        return;
      }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      setError('Грешка при промяна на паролата. Опитайте отново.');
    } else {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setSaving(false);
  }

  if (hasPassword === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-orange)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          Паролата е променена успешно
        </div>
      )}

      {hasPassword && (
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Текуща парола
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
          />
        </div>
      )}

      {!hasPassword && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
          Акаунтът ви все още няма зададена парола. Задайте парола по-долу.
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Нова парола
        </label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
        {validationErrors.length > 0 && (
          <ul className="mt-2 space-y-1">
            {validationErrors.map((err) => (
              <li key={err} className="text-xs text-red-500 flex items-center gap-1">
                <span>•</span> {err}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Потвърдете новата парола
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-red-500 mt-1">Паролите не съвпадат</p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-[var(--color-brand-navy)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {saving ? 'Промяна...' : 'Промени паролата'}
      </button>
    </form>
  );
}
