'use client';

import { useState, useCallback, useId } from 'react';
import type { AddressRow } from '@/lib/supabase/types';
import type { AddressInput, SpeedyOfficeSelection, DeliveryMethod } from '@/lib/order';
import { validateAddress, validateSpeedyOffice } from '@/lib/order';
import SpeedyOfficeSelector from '@/components/order/SpeedyOfficeSelector';

// ============================================================================
// Types
// ============================================================================

interface AdminAddressFormProps {
  mode: 'create' | 'edit';
  userId: string;
  initialData?: AddressRow;
  onSuccess: (address: AddressRow) => void;
  onCancel: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function buildInitialAddress(initialData?: AddressRow): AddressInput {
  if (!initialData) {
    return {
      label: '',
      fullName: '',
      phone: '',
      city: '',
      postalCode: '',
      streetAddress: '',
      buildingEntrance: '',
      floor: '',
      apartment: '',
      deliveryNotes: '',
      isDefault: false,
    };
  }
  return {
    label: initialData.label ?? '',
    fullName: initialData.full_name,
    phone: initialData.phone ?? '',
    city: initialData.city ?? '',
    postalCode: initialData.postal_code ?? '',
    streetAddress: initialData.street_address ?? '',
    buildingEntrance: initialData.building_entrance ?? '',
    floor: initialData.floor ?? '',
    apartment: initialData.apartment ?? '',
    deliveryNotes: initialData.delivery_notes ?? '',
    isDefault: initialData.is_default,
  };
}

function buildInitialOffice(initialData?: AddressRow): SpeedyOfficeSelection | null {
  if (
    initialData?.delivery_method === 'speedy_office' &&
    initialData.speedy_office_id &&
    initialData.speedy_office_name
  ) {
    return {
      id: initialData.speedy_office_id,
      name: initialData.speedy_office_name,
      address: initialData.speedy_office_address ?? '',
    };
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function AdminAddressForm({
  mode,
  userId,
  initialData,
  onSuccess,
  onCancel,
}: AdminAddressFormProps) {
  const uid = useId();
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    initialData?.delivery_method ?? 'address',
  );
  const [address, setAddress] = useState<AddressInput>(() => buildInitialAddress(initialData));
  const [speedyOffice, setSpeedyOffice] = useState<SpeedyOfficeSelection | null>(() =>
    buildInitialOffice(initialData),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = useCallback(
    (field: keyof AddressInput, value: string | boolean) => {
      setAddress((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const handleOfficeSelect = useCallback((office: SpeedyOfficeSelection) => {
    setSpeedyOffice(office);
    setFieldErrors((prev) => {
      if (!prev.speedyOffice) return prev;
      const next = { ...prev };
      delete next.speedyOffice;
      return next;
    });
  }, []);

  const handleMethodChange = useCallback(
    (method: DeliveryMethod) => {
      if (method === deliveryMethod) return;
      setDeliveryMethod(method);
      setFieldErrors({});
      setApiError(null);

      if (method === 'address') {
        setSpeedyOffice(null);
      } else {
        setAddress((prev) => ({
          ...prev,
          city: '',
          postalCode: '',
          streetAddress: '',
          buildingEntrance: '',
          floor: '',
          apartment: '',
        }));
      }
    },
    [deliveryMethod],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const result =
      deliveryMethod === 'address'
        ? validateAddress(address)
        : validateSpeedyOffice(address, speedyOffice);

    if (!result.valid) {
      const errors: Record<string, string> = {};
      for (const err of result.errors) {
        errors[err.field] = err.message;
      }
      setFieldErrors(errors);
      return;
    }

    const body =
      deliveryMethod === 'address'
        ? {
            ...(mode === 'create' && { userId }),
            deliveryMethod: 'address' as const,
            label: address.label,
            fullName: address.fullName,
            phone: address.phone,
            city: address.city,
            postalCode: address.postalCode,
            streetAddress: address.streetAddress,
            buildingEntrance: address.buildingEntrance,
            floor: address.floor,
            apartment: address.apartment,
            deliveryNotes: address.deliveryNotes,
            isDefault: address.isDefault,
          }
        : {
            ...(mode === 'create' && { userId }),
            deliveryMethod: 'speedy_office' as const,
            label: address.label,
            fullName: address.fullName,
            phone: address.phone,
            speedyOfficeId: speedyOffice!.id,
            speedyOfficeName: speedyOffice!.name,
            speedyOfficeAddress: speedyOffice!.address,
            deliveryNotes: address.deliveryNotes,
            isDefault: address.isDefault,
          };

    setSubmitting(true);
    try {
      const url =
        mode === 'edit' && initialData
          ? `/api/admin/address/${initialData.id}`
          : '/api/admin/address';
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Грешка при запазване (${res.status})`);
      }

      const data = await res.json();
      onSuccess(data.address ?? data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setSubmitting(false);
    }
  };

  const errorFor = (field: string) => fieldErrors[field] ?? null;
  const errorId = (field: string) => `${uid}-err-${field}`;

  const inputClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-brand-orange)] focus:border-[var(--color-brand-orange)] outline-none ${
      errorFor(field) ? 'border-red-500' : ''
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {apiError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {/* Delivery Method Toggle */}
      <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => handleMethodChange('address')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            deliveryMethod === 'address'
              ? 'bg-white text-[var(--color-brand-navy)] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📍 До адрес
        </button>
        <button
          type="button"
          onClick={() => handleMethodChange('speedy_office')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            deliveryMethod === 'speedy_office'
              ? 'bg-white text-[var(--color-brand-navy)] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 До офис на Speedy
        </button>
      </div>

      {/* Common Fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor={`${uid}-label`} className="block text-sm font-medium text-gray-700 mb-1">
            Етикет
          </label>
          <input
            id={`${uid}-label`}
            type="text"
            value={address.label}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            placeholder="напр. Вкъщи, Офис"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-brand-orange)] focus:border-[var(--color-brand-orange)] outline-none"
          />
        </div>

        <div>
          <label htmlFor={`${uid}-fullName`} className="block text-sm font-medium text-gray-700 mb-1">
            Имена <span className="text-red-500">*</span>
          </label>
          <input
            id={`${uid}-fullName`}
            type="text"
            value={address.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            aria-invalid={!!errorFor('fullName')}
            aria-describedby={errorFor('fullName') ? errorId('fullName') : undefined}
            className={inputClass('fullName')}
          />
          {errorFor('fullName') && (
            <p id={errorId('fullName')} className="text-xs text-red-600 mt-1">
              {errorFor('fullName')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${uid}-phone`} className="block text-sm font-medium text-gray-700 mb-1">
            Телефон
            {deliveryMethod === 'speedy_office' && (
              <span className="text-xs text-gray-500 ml-1">(задължителен за Speedy доставка)</span>
            )}
          </label>
          <input
            id={`${uid}-phone`}
            type="tel"
            value={address.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            aria-invalid={!!errorFor('phone')}
            aria-describedby={errorFor('phone') ? errorId('phone') : undefined}
            className={inputClass('phone')}
          />
          {errorFor('phone') && (
            <p id={errorId('phone')} className="text-xs text-red-600 mt-1">
              {errorFor('phone')}
            </p>
          )}
        </div>
      </div>

      {/* Home Delivery Fields */}
      {deliveryMethod === 'address' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor={`${uid}-city`} className="block text-sm font-medium text-gray-700 mb-1">
                Град <span className="text-red-500">*</span>
              </label>
              <input
                id={`${uid}-city`}
                type="text"
                value={address.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                aria-invalid={!!errorFor('city')}
                aria-describedby={errorFor('city') ? errorId('city') : undefined}
                className={inputClass('city')}
              />
              {errorFor('city') && (
                <p id={errorId('city')} className="text-xs text-red-600 mt-1">
                  {errorFor('city')}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${uid}-postalCode`} className="block text-sm font-medium text-gray-700 mb-1">
                Пощ. код <span className="text-red-500">*</span>
              </label>
              <input
                id={`${uid}-postalCode`}
                type="text"
                value={address.postalCode}
                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                placeholder="напр. 1000"
                aria-invalid={!!errorFor('postalCode')}
                aria-describedby={errorFor('postalCode') ? errorId('postalCode') : undefined}
                className={inputClass('postalCode')}
              />
              {errorFor('postalCode') && (
                <p id={errorId('postalCode')} className="text-xs text-red-600 mt-1">
                  {errorFor('postalCode')}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor={`${uid}-streetAddress`} className="block text-sm font-medium text-gray-700 mb-1">
              Адрес <span className="text-red-500">*</span>
            </label>
            <input
              id={`${uid}-streetAddress`}
              type="text"
              value={address.streetAddress}
              onChange={(e) => handleFieldChange('streetAddress', e.target.value)}
              aria-invalid={!!errorFor('streetAddress')}
              aria-describedby={errorFor('streetAddress') ? errorId('streetAddress') : undefined}
              className={inputClass('streetAddress')}
            />
            {errorFor('streetAddress') && (
              <p id={errorId('streetAddress')} className="text-xs text-red-600 mt-1">
                {errorFor('streetAddress')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor={`${uid}-buildingEntrance`} className="block text-sm font-medium text-gray-700 mb-1">
                Вход
              </label>
              <input
                id={`${uid}-buildingEntrance`}
                type="text"
                value={address.buildingEntrance}
                onChange={(e) => handleFieldChange('buildingEntrance', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-brand-orange)] focus:border-[var(--color-brand-orange)] outline-none"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-floor`} className="block text-sm font-medium text-gray-700 mb-1">
                Етаж
              </label>
              <input
                id={`${uid}-floor`}
                type="text"
                value={address.floor}
                onChange={(e) => handleFieldChange('floor', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-brand-orange)] focus:border-[var(--color-brand-orange)] outline-none"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-apartment`} className="block text-sm font-medium text-gray-700 mb-1">
                Апартамент
              </label>
              <input
                id={`${uid}-apartment`}
                type="text"
                value={address.apartment}
                onChange={(e) => handleFieldChange('apartment', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-brand-orange)] focus:border-[var(--color-brand-orange)] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Speedy Office Selector */}
      {deliveryMethod === 'speedy_office' && (
        <div>
          <SpeedyOfficeSelector
            selectedOffice={speedyOffice}
            onSelect={handleOfficeSelect}
            error={errorFor('speedyOffice')}
          />
        </div>
      )}

      {/* Bottom Section */}
      <div className="space-y-4">
        <div>
          <label htmlFor={`${uid}-deliveryNotes`} className="block text-sm font-medium text-gray-700 mb-1">
            Бележки за доставка
          </label>
          <textarea
            id={`${uid}-deliveryNotes`}
            value={address.deliveryNotes}
            onChange={(e) => handleFieldChange('deliveryNotes', e.target.value)}
            placeholder="Бележки за доставка"
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[var(--color-brand-orange)] focus:border-[var(--color-brand-orange)] outline-none resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={address.isDefault}
            onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
            className="rounded border-gray-300 text-[var(--color-brand-orange)] focus:ring-[var(--color-brand-orange)]"
          />
          <span className="text-sm text-gray-700">Адрес по подразбиране</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-[var(--color-brand-orange)] text-white rounded-lg px-4 py-2.5 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Запазване...' : 'Запази'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2.5 font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Отказ
          </button>
        </div>
      </div>
    </form>
  );
}
