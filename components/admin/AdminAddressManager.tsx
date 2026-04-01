'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AddressRow } from '@/lib/supabase/types';
import AdminAddressForm from './AdminAddressForm';

// ============================================================================
// Types
// ============================================================================

interface AdminAddressManagerProps {
  userId: string;
  initialAddresses: AddressRow[];
  canManage: boolean;
}

type FormMode = 'hidden' | 'create' | 'edit';

// ============================================================================
// Helpers
// ============================================================================

function formatAddressDisplay(addr: AddressRow): { primary: string; secondary?: string } {
  if (addr.delivery_method === 'speedy_office') {
    return {
      primary: addr.speedy_office_name ?? 'Speedy офис',
      secondary: addr.speedy_office_address ?? undefined,
    };
  }
  const parts = [addr.street_address, addr.city, addr.postal_code].filter(Boolean);
  if (addr.building_entrance) parts.push(`вх. ${addr.building_entrance}`);
  if (addr.floor) parts.push(`ет. ${addr.floor}`);
  if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
  return { primary: parts.join(', ') };
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function AdminAddressManager({
  userId,
  initialAddresses,
  canManage,
}: AdminAddressManagerProps) {
  const [addresses, setAddresses] = useState<AddressRow[]>(initialAddresses);
  const [formMode, setFormMode] = useState<FormMode>('hidden');
  const [editingAddress, setEditingAddress] = useState<AddressRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) return;
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  useEffect(() => {
    if (formMode !== 'hidden' && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formMode]);

  // ---- Form handlers ----

  const openCreateForm = useCallback(() => {
    setFormMode('create');
    setEditingAddress(null);
    setError(null);
  }, []);

  const openEditForm = useCallback((addr: AddressRow) => {
    setFormMode('edit');
    setEditingAddress(addr);
    setError(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormMode('hidden');
    setEditingAddress(null);
  }, []);

  // ---- CRUD handlers ----

  const handleCreate = useCallback(
    (address: AddressRow) => {
      setAddresses((prev) => {
        if (address.is_default) {
          return [address, ...prev.map((a) => ({ ...a, is_default: false }))];
        }
        return [address, ...prev];
      });
      closeForm();
    },
    [closeForm],
  );

  const handleUpdate = useCallback(
    (address: AddressRow) => {
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === address.id) return address;
          if (address.is_default) return { ...a, is_default: false };
          return a;
        }),
      );
      closeForm();
    },
    [closeForm],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(`/api/admin/address/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Грешка при изтриване (${res.status})`);
        }

        const wasDefault = addresses.find((a) => a.id === id)?.is_default;

        if (wasDefault && addresses.length > 1) {
          const listRes = await fetch(`/api/admin/address?userId=${userId}`);
          if (listRes.ok) {
            const listData = await listRes.json();
            setAddresses(listData.addresses ?? []);
          } else {
            setAddresses((prev) => prev.filter((a) => a.id !== id));
          }
        } else {
          setAddresses((prev) => prev.filter((a) => a.id !== id));
        }

        setConfirmDeleteId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
      } finally {
        setDeletingId(null);
      }
    },
    [addresses, userId],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      setSettingDefaultId(id);
      setError(null);
      try {
        const res = await fetch(`/api/admin/address/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDefault: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Грешка при задаване по подразбиране (${res.status})`);
        }
        setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
      } finally {
        setSettingDefaultId(null);
      }
    },
    [],
  );

  // ---- Render ----

  const isFormOpen = formMode !== 'hidden';
  const canAddMore = addresses.length < 10;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
        Адреси ({addresses.length})
      </h2>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start justify-between gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 hover:text-red-600"
            aria-label="Затвори"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline Form */}
      {isFormOpen && (
        <div ref={formRef} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
            {formMode === 'create' ? 'Нов адрес' : 'Редактиране на адрес'}
          </h3>
          <AdminAddressForm
            mode={formMode === 'create' ? 'create' : 'edit'}
            userId={userId}
            initialData={editingAddress ?? undefined}
            onSuccess={formMode === 'create' ? handleCreate : handleUpdate}
            onCancel={closeForm}
          />
        </div>
      )}

      {/* Add Button */}
      {canManage && !isFormOpen && addresses.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={openCreateForm}
            disabled={!canAddMore}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Добави адрес
          </button>
          {!canAddMore && (
            <p className="mt-1 text-xs text-gray-500">Максимум 10 адреса</p>
          )}
        </div>
      )}

      {/* Empty State */}
      {addresses.length === 0 && !isFormOpen && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">Няма запазени адреси.</p>
          {canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-90"
            >
              + Добави адрес
            </button>
          )}
        </div>
      )}

      {/* Address Cards */}
      {addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const display = formatAddressDisplay(addr);
            const isDeleting = deletingId === addr.id;
            const isConfirmingDelete = confirmDeleteId === addr.id;
            const isSettingDefault = settingDefaultId === addr.id;

            return (
              <div key={addr.id} className="bg-white rounded-xl border border-gray-200 p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm text-gray-800">
                    {addr.label || 'Без етикет'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {addr.delivery_method === 'speedy_office' ? '📦 Speedy' : '📍 Адрес'}
                  </span>
                  {addr.is_default && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-brand-orange)] text-white">
                      По подразбиране
                    </span>
                  )}
                </div>

                {/* Details */}
                <p className="text-sm text-gray-700">{addr.full_name}</p>
                {addr.phone && <p className="text-sm text-gray-500">{addr.phone}</p>}
                <p className="text-sm text-gray-600 mt-1">{display.primary}</p>
                {display.secondary && (
                  <p className="text-sm text-gray-400">{display.secondary}</p>
                )}
                {addr.delivery_notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">{addr.delivery_notes}</p>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    {!isConfirmingDelete ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditForm(addr)}
                          disabled={isFormOpen}
                          className="text-sm text-[var(--color-brand-navy)] hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          Редактирай
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(addr.id)}
                          className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          Изтрий
                        </button>

                        {!addr.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr.id)}
                            disabled={isSettingDefault}
                            className="text-sm text-gray-600 hover:text-[var(--color-brand-navy)] hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                          >
                            {isSettingDefault ? (
                              <span className="inline-flex items-center gap-1">
                                <Spinner />
                                Задаване…
                              </span>
                            ) : (
                              'Направи основен'
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Сигурни ли сте?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(addr.id)}
                          disabled={isDeleting}
                          className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <span className="inline-flex items-center gap-1">
                              <Spinner />
                              Изтриване…
                            </span>
                          ) : (
                            'Да, изтрий'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          Отказ
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
