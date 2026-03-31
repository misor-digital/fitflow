'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AddressRow } from '@/lib/supabase/types';
import AddressForm from './AddressForm';

// ============================================================================
// Types
// ============================================================================

interface AddressesManagerProps {
  initialAddresses: AddressRow[];
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

// ============================================================================
// Component
// ============================================================================

export default function AddressesManager({ initialAddresses }: AddressesManagerProps) {
  const [addresses, setAddresses] = useState<AddressRow[]>(initialAddresses);
  const [formMode, setFormMode] = useState<FormMode>('hidden');
  const [editingAddress, setEditingAddress] = useState<AddressRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!error) return;
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  // Scroll to form when it opens
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

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/address/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Грешка при изтриване (${res.status})`);
      }
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleSetDefault = useCallback(async (id: string) => {
    setSettingDefaultId(id);
    setError(null);
    try {
      const res = await fetch(`/api/address/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Грешка при задаване по подразбиране (${res.status})`);
      }
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setSettingDefaultId(null);
    }
  }, []);

  // ---- Render ----

  const isFormOpen = formMode !== 'hidden';
  const canAddMore = addresses.length < 10;

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-start justify-between gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
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

      {/* Form Section */}
      {isFormOpen && (
        <div ref={formRef} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
            {formMode === 'create' ? 'Нов адрес' : 'Редактиране на адрес'}
          </h3>
          <AddressForm
            mode={formMode === 'create' ? 'create' : 'edit'}
            initialData={editingAddress ?? undefined}
            onSuccess={formMode === 'create' ? handleCreate : handleUpdate}
            onCancel={closeForm}
          />
        </div>
      )}

      {/* Add Button */}
      {!isFormOpen && addresses.length > 0 && (
        <div>
          <button
            type="button"
            onClick={openCreateForm}
            disabled={!canAddMore}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Добави нов адрес
          </button>
          {!canAddMore && (
            <p className="mt-1 text-xs text-gray-500">Максимум 10 адреса</p>
          )}
        </div>
      )}

      {/* Empty State */}
      {addresses.length === 0 && !isFormOpen && (
        <div className="text-center py-12">
          <p className="text-gray-600 font-medium">Нямате запазени адреси.</p>
          <p className="text-sm text-gray-400 mt-1">
            Добавете адрес, за да го използвате при поръчки и абонаменти.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-90"
          >
            Добави първия си адрес
          </button>
        </div>
      )}

      {/* Address Cards */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((addr) => {
            const display = formatAddressDisplay(addr);
            const isDeleting = deletingId === addr.id;
            const isConfirmingDelete = confirmDeleteId === addr.id;
            const isSettingDefault = settingDefaultId === addr.id;

            return (
              <div
                key={addr.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                {/* Header: label + badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-medium text-[var(--color-brand-navy)]">
                    {addr.label || 'Без етикет'}
                  </span>

                  {addr.delivery_method === 'address' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      📍 До адрес
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      📦 Speedy офис
                    </span>
                  )}

                  {addr.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">
                      ⭐ По подразбиране
                    </span>
                  )}
                </div>

                {/* Name & phone */}
                <p className="text-sm text-gray-800">{addr.full_name}</p>
                {addr.phone && (
                  <p className="text-sm text-gray-500">{addr.phone}</p>
                )}

                {/* Address */}
                <p className="text-sm text-gray-700 mt-1">{display.primary}</p>
                {display.secondary && (
                  <p className="text-xs text-gray-400">{display.secondary}</p>
                )}

                {/* Delivery notes */}
                {addr.delivery_notes && (
                  <p className="text-xs text-gray-400 italic mt-1">{addr.delivery_notes}</p>
                )}

                {/* Actions */}
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
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
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
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
