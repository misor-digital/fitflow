'use client';

import { useState } from 'react';
import type { AddressRow } from '@/lib/supabase/types';

interface AddressModalProps {
  subscriptionId: string;
  currentAddressId: string | null;
  addresses: AddressRow[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function AddressModal({
  subscriptionId,
  currentAddressId,
  addresses,
  onSuccess,
  onClose,
}: AddressModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentAddressId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selectedId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_address', addressId: selectedId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Възникна грешка.');
        return;
      }

      onSuccess();
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: AddressRow) => {
    const parts = [addr.street_address, addr.city, addr.postal_code];
    if (addr.building_entrance) parts.push(`вх. ${addr.building_entrance}`);
    if (addr.floor) parts.push(`ет. ${addr.floor}`);
    if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
    return parts.join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Промяна на адрес
        </h2>

        {addresses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-4">Нямате запазени адреси.</p>
            <a
              href="/account/edit"
              className="text-sm text-[var(--color-brand-orange)] hover:underline font-medium"
            >
              Добавете адрес в профила си →
            </a>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === addr.id
                    ? 'border-[var(--color-brand-orange)] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  checked={selectedId === addr.id}
                  onChange={() => setSelectedId(addr.id)}
                  className="mt-0.5 text-[var(--color-brand-orange)] focus:ring-[var(--color-brand-orange)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {addr.label || addr.full_name}
                    </span>
                    {addr.is_default && (
                      <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        По подразбиране
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {formatAddress(addr)}
                  </p>
                  {addr.phone && (
                    <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <a
          href="/account/edit"
          className="inline-block text-sm text-[var(--color-brand-orange)] hover:underline font-medium mb-4"
        >
          + Използвай нов адрес
        </a>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Отказ
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !selectedId || selectedId === currentAddressId}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-orange)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Запазване...' : 'Запази'}
          </button>
        </div>
      </div>
    </div>
  );
}
