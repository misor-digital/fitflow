'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { formatPriceDual } from '@/lib/catalog';
import { FREQUENCY_LABELS } from '@/lib/subscription';
import {
  validateAddress,
  validateSpeedyOffice,
  getAddressFieldError,
} from '@/lib/order';
import type {
  AddressInput,
  DeliveryMethod,
  SpeedyOfficeSelection,
} from '@/lib/order';
import { useOrderStore } from '@/store/orderStore';
import DeliveryMethodToggle from '@/components/order/DeliveryMethodToggle';
import SpeedyOfficeSelector from '@/components/order/SpeedyOfficeSelector';
import AdminCustomerPanel from '@/components/order/AdminCustomerPanel';
import { trackOrderToSubscriptionConversion } from '@/lib/analytics/subscription';
import type { SubscriptionConversionFlowProps } from './conversion-types';

// ============================================================================
// Types
// ============================================================================

type ConversionStep = 'summary' | 'details' | 'confirm';
type Frequency = 'monthly' | 'seasonal';

interface SavedAddress {
  id: string;
  label: string | null;
  full_name: string;
  phone: string | null;
  city: string;
  postal_code: string;
  street_address: string;
  building_entrance: string | null;
  floor: string | null;
  apartment: string | null;
  delivery_notes: string | null;
  delivery_method: string | null;
  speedy_office_id: string | null;
  speedy_office_name: string | null;
  speedy_office_address: string | null;
  is_default: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_ADDRESS: AddressInput = {
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

// ============================================================================
// Component
// ============================================================================

export default function SubscriptionConversionFlow({
  source,
  priceInfo,
  catalogData,
  boxTypeNames,
}: SubscriptionConversionFlowProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const isAuthenticated = !!user;
  const isAdmin =
    isAuthenticated &&
    user?.userType === 'staff' &&
    (user?.staffRole === 'admin' || user?.staffRole === 'super_admin');

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<ConversionStep>('summary');

  // ── Step 1: frequency ───────────────────────────────────────────────────
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [frequencyError, setFrequencyError] = useState(false);

  // ── Step 2: contact ─────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(source.customerFullName);
  const [phone, setPhone] = useState(source.customerPhone ?? '');

  // ── Step 2: address ─────────────────────────────────────────────────────
  const [address, setAddress] = useState<AddressInput>({
    ...EMPTY_ADDRESS,
    fullName: source.customerFullName,
    phone: source.customerPhone ?? '',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('address');
  const [speedyOffice, setSpeedyOffice] = useState<SpeedyOfficeSelection | null>(null);
  const [officeError, setOfficeError] = useState<string | null>(null);

  // Saved addresses (authenticated)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // ── Step 2: admin ───────────────────────────────────────────────────────
  const [onBehalfOfUserId, setOnBehalfOfUserId] = useState<string | null>(null);

  // ── Step 2: personalization overrides ───────────────────────────────────
  const [showPreferences, setShowPreferences] = useState(false);
  const [sports, setSports] = useState<string[]>(source.sports ?? []);
  const [colors, setColors] = useState<string[]>(source.colors ?? []);
  const [flavors, setFlavors] = useState<string[]>(source.flavors ?? []);
  const [dietary, setDietary] = useState<string[]>(source.dietary ?? []);
  const [sizeUpper, setSizeUpper] = useState(source.sizeUpper ?? '');
  const [sizeLower, setSizeLower] = useState(source.sizeLower ?? '');

  // ── Validation ──────────────────────────────────────────────────────────
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // ── Submit state ────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────
  const boxLabel = boxTypeNames[source.boxType] ?? source.boxType;

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Fetch saved addresses for authenticated users
  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;
    const controller = new AbortController();

    async function fetchAddresses() {
      try {
        setLoadingAddresses(true);
        const res = await fetch('/api/address', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const addrs: SavedAddress[] = data.addresses || [];
          setSavedAddresses(addrs);
          setSelectedAddressId((prev) => {
            if (!prev && addrs.length > 0) {
              const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
              return defaultAddr.id;
            }
            return prev;
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setLoadingAddresses(false);
      }
    }

    fetchAddresses();
    return () => controller.abort();
  }, [isAuthenticated, isAdmin]);

  // Listen for AdminCustomerPanel setting onBehalfOfUserId via orderStore
  // AdminCustomerPanel writes to orderStore, so we mirror it here.
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = useOrderStore.subscribe((state) => {
      if (state.onBehalfOfUserId !== onBehalfOfUserId) {
        setOnBehalfOfUserId(state.onBehalfOfUserId);
      }
    });
    return unsub;
  }, [isAdmin, onBehalfOfUserId]);

  // ── Address field change ────────────────────────────────────────────────
  const handleAddressChange = useCallback(
    (field: keyof AddressInput, value: string) => {
      setAddress((prev) => ({ ...prev, [field]: value }));
      if (hasAttemptedSubmit) {
        const err = getAddressFieldError(field, { ...address, [field]: value });
        setAddressErrors((prev) => {
          const next = { ...prev };
          if (err) next[field] = err;
          else delete next[field];
          return next;
        });
      }
    },
    [hasAttemptedSubmit, address],
  );

  const handleDeliveryMethodChange = useCallback((method: DeliveryMethod) => {
    setDeliveryMethod(method);
    setOfficeError(null);
    setAddressErrors({});
    setHasAttemptedSubmit(false);
  }, []);

  const handleOfficeSelect = useCallback((office: SpeedyOfficeSelection) => {
    setSpeedyOffice(office);
    setOfficeError(null);
  }, []);

  // ── Validate contact ───────────────────────────────────────────────────
  const validateContact = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Името трябва да е поне 2 символа';
    }
    if (!phone.trim()) {
      errors.phone = 'Телефонът е задължителен';
    }
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, phone]);

  // ── Step 1 → Step 2 ────────────────────────────────────────────────────
  const handleSummaryNext = useCallback(() => {
    if (!frequency) {
      setFrequencyError(true);
      return;
    }
    setFrequencyError(false);
    setStep('details');
  }, [frequency]);

  // ── Step 2 → Step 3 ────────────────────────────────────────────────────
  const handleDetailsNext = useCallback(() => {
    setHasAttemptedSubmit(true);

    // Admin requires account
    if (isAdmin && !onBehalfOfUserId) return;

    // Guest & admin-guest: validate contact
    if (!isAuthenticated || isAdmin) {
      if (!validateContact()) return;
    }

    // Validate address or speedy office
    if (isAuthenticated && !isAdmin && selectedAddressId && !showNewAddressForm) {
      // Using saved address — no validation needed
    } else if (deliveryMethod === 'speedy_office') {
      const result = validateSpeedyOffice(address, speedyOffice);
      if (!result.valid) {
        const errors: Record<string, string> = {};
        for (const e of result.errors) {
          if (e.field === 'speedyOffice') setOfficeError(e.message);
          else errors[e.field] = e.message;
        }
        setAddressErrors(errors);
        return;
      }
    } else {
      const result = validateAddress(address);
      if (!result.valid) {
        const errors: Record<string, string> = {};
        for (const e of result.errors) errors[e.field] = e.message;
        setAddressErrors(errors);
        return;
      }
    }

    setStep('confirm');
  }, [
    isAuthenticated,
    isAdmin,
    onBehalfOfUserId,
    validateContact,
    selectedAddressId,
    showNewAddressForm,
    deliveryMethod,
    address,
    speedyOffice,
  ]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
        boxType: source.boxType,
        frequency,
        wantsPersonalization: source.wantsPersonalization,
        preferences: { sports, colors, flavors, dietary },
        sizes: { upper: sizeUpper, lower: sizeLower },
        conversionToken: source.conversionToken,
        campaignPromoCode: source.campaignPromoCode,
        fullName: fullName.trim(),
        email: source.customerEmail,
        phone: phone.trim(),
      };

      if (onBehalfOfUserId) {
        body.onBehalfOfUserId = onBehalfOfUserId;
      }

      // Address resolution
      if (isAuthenticated && !isAdmin && selectedAddressId && !showNewAddressForm) {
        body.addressId = selectedAddressId;
      } else if (deliveryMethod === 'speedy_office' && speedyOffice) {
        body.deliveryMethod = 'speedy_office';
        body.speedyOfficeId = speedyOffice.id;
        body.speedyOfficeName = speedyOffice.name;
        body.speedyOfficeAddress = speedyOffice.address;
        body.address = {
          fullName: address.fullName,
          phone: address.phone,
          deliveryNotes: address.deliveryNotes,
        };
      } else {
        body.deliveryMethod = 'address';
        body.address = {
          fullName: address.fullName,
          phone: address.phone,
          city: address.city,
          postalCode: address.postalCode,
          streetAddress: address.streetAddress,
          buildingEntrance: address.buildingEntrance,
          floor: address.floor,
          apartment: address.apartment,
          deliveryNotes: address.deliveryNotes,
        };
      }

      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Възникна грешка.');
      }

      trackOrderToSubscriptionConversion({
        orderNumber: source.orderNumber,
        boxType: source.boxType,
        frequency: frequency!,
        value: priceInfo.finalPriceEur,
        wasGuest: !isAuthenticated,
      });

      if (isAuthenticated && !isAdmin) {
        router.push('/account/subscriptions');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Неочаквана грешка.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    source,
    frequency,
    sports,
    colors,
    flavors,
    dietary,
    sizeUpper,
    sizeLower,
    fullName,
    phone,
    onBehalfOfUserId,
    isAuthenticated,
    isAdmin,
    selectedAddressId,
    showNewAddressForm,
    deliveryMethod,
    speedyOffice,
    address,
    router,
  ]);

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderField = (
    label: string,
    field: string,
    value: string,
    onChange: (val: string) => void,
    required: boolean,
    errorSource: Record<string, string>,
    opts?: { type?: string; readOnly?: boolean; icon?: React.ReactNode; hint?: string },
  ) => {
    const error = hasAttemptedSubmit ? errorSource[field] : undefined;
    return (
      <div>
        <label className="block text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={opts?.type ?? 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={opts?.readOnly}
            className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
              opts?.readOnly
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                : error
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
            }`}
          />
          {opts?.icon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {opts.icon}
            </span>
          )}
        </div>
        {opts?.hint && !error && (
          <p className="text-xs text-gray-500 mt-1">{opts.hint}</p>
        )}
        {error && <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>}
      </div>
    );
  };

  const renderAddressForm = () => (
    <div className="space-y-3 sm:space-y-4">
      {renderField('Име на получател', 'fullName', address.fullName, (v) => handleAddressChange('fullName', v), true, addressErrors)}
      {renderField('Телефон', 'phone', address.phone, (v) => handleAddressChange('phone', v), false, addressErrors, { type: 'tel' })}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {renderField('Град', 'city', address.city, (v) => handleAddressChange('city', v), true, addressErrors)}
        {renderField('Пощенски код', 'postalCode', address.postalCode, (v) => handleAddressChange('postalCode', v), true, addressErrors)}
      </div>
      {renderField('Адрес (улица, номер)', 'streetAddress', address.streetAddress, (v) => handleAddressChange('streetAddress', v), true, addressErrors)}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {renderField('Вход', 'buildingEntrance', address.buildingEntrance, (v) => handleAddressChange('buildingEntrance', v), false, addressErrors)}
        {renderField('Етаж', 'floor', address.floor, (v) => handleAddressChange('floor', v), false, addressErrors)}
        {renderField('Апартамент', 'apartment', address.apartment, (v) => handleAddressChange('apartment', v), false, addressErrors)}
      </div>
    </div>
  );

  const renderOfficeForm = () => (
    <div className="space-y-3 sm:space-y-4">
      {renderField('Име на получател', 'fullName', address.fullName, (v) => handleAddressChange('fullName', v), true, addressErrors)}
      {renderField('Телефон', 'phone', address.phone, (v) => handleAddressChange('phone', v), true, addressErrors, { type: 'tel' })}
      <div>
        <label className="block text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-1.5">
          Офис на Speedy <span className="text-red-500">*</span>
        </label>
        <SpeedyOfficeSelector
          selectedOffice={speedyOffice}
          onSelect={handleOfficeSelect}
          error={hasAttemptedSubmit ? officeError : null}
        />
      </div>
    </div>
  );

  const renderSavedAddresses = () => {
    if (loadingAddresses) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-orange)]" />
        </div>
      );
    }

    if (savedAddresses.length > 0 && !showNewAddressForm) {
      return (
        <div className="space-y-3">
          {savedAddresses.map((addr) => (
            <div
              key={addr.id}
              onClick={() => setSelectedAddressId(addr.id)}
              className={`rounded-xl p-4 cursor-pointer transition-all border-3 ${
                selectedAddressId === addr.id
                  ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 w-5 h-5 rounded-full border-3 flex-shrink-0 ${
                    selectedAddressId === addr.id
                      ? 'border-[var(--color-brand-orange)]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedAddressId === addr.id && (
                    <div className="w-full h-full rounded-full bg-[var(--color-brand-orange)] scale-[0.5]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {addr.label && (
                    <div className="text-xs font-semibold text-[var(--color-brand-orange)] uppercase tracking-wide mb-1">
                      {addr.label}
                    </div>
                  )}
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)]">
                    {addr.full_name}
                  </div>
                  {addr.delivery_method === 'speedy_office' && addr.speedy_office_name ? (
                    <div className="text-sm text-gray-600 mt-0.5">
                      📦 Офис на Speedy: {addr.speedy_office_name}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {addr.street_address}
                        {addr.building_entrance && `, Вход ${addr.building_entrance}`}
                        {addr.floor && `, ет. ${addr.floor}`}
                        {addr.apartment && `, ап. ${addr.apartment}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {addr.postal_code} {addr.city}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowNewAddressForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] hover:border-[var(--color-brand-orange)] hover:text-[var(--color-brand-orange)] transition-all"
          >
            + Добави нов адрес
          </button>
        </div>
      );
    }

    return (
      <div>
        {savedAddresses.length > 0 && showNewAddressForm && (
          <button
            onClick={() => setShowNewAddressForm(false)}
            className="text-sm text-[var(--color-brand-orange)] font-semibold mb-4 hover:underline"
          >
            ← Назад към запазените адреси
          </button>
        )}
        {/* Delivery method + form for new address */}
        <div className="space-y-4">
          <DeliveryMethodToggle value={deliveryMethod} onChange={handleDeliveryMethodChange} />
          {deliveryMethod === 'speedy_office' ? renderOfficeForm() : renderAddressForm()}
        </div>
      </div>
    );
  };

  const renderPersonalizationOverrides = () => {
    const mapOptions = (opts: Array<{ id: string; label: string; value?: string | null }>) =>
      opts.map((o) => ({ value: o.value ?? o.id, label: o.label }));

    const sportOpts = mapOptions(catalogData.options.sports);
    const colorOpts = mapOptions(catalogData.options.colors);
    const flavorOpts = mapOptions(catalogData.options.flavors);
    const dietaryOpts = mapOptions(catalogData.options.dietary);
    const sizeOptions = mapOptions(catalogData.options.sizes);

    const renderCheckboxGroup = (
      label: string,
      options: Array<{ value: string; label: string }>,
      selected: string[],
      onChange: (vals: string[]) => void,
    ) => (
      <div>
        <label className="block text-sm font-semibold text-[var(--color-brand-navy)] mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange(
                    checked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value],
                  )
                }
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                  checked
                    ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-[var(--color-brand-orange)]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );

    const renderSizeSelect = (
      label: string,
      value: string,
      onChange: (v: string) => void,
    ) => (
      <div>
        <label className="block text-sm font-semibold text-[var(--color-brand-navy)] mb-1.5">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm text-[var(--color-brand-navy)] focus:border-[var(--color-brand-orange)] focus:outline-none"
        >
          <option value="">Без избор</option>
          {sizeOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    );

    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <button
          type="button"
          onClick={() => setShowPreferences(!showPreferences)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">
            Промени предпочитания
          </h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showPreferences ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showPreferences && (
          <div className="space-y-4 mt-4 pt-4 border-t">
            {sportOpts.length > 0 && renderCheckboxGroup('Спорт', sportOpts, sports, setSports)}
            {colorOpts.length > 0 && renderCheckboxGroup('Цветове', colorOpts, colors, setColors)}
            {flavorOpts.length > 0 && renderCheckboxGroup('Вкусове', flavorOpts, flavors, setFlavors)}
            {dietaryOpts.length > 0 && renderCheckboxGroup('Хранителни предпочитания', dietaryOpts, dietary, setDietary)}
            <div className="grid grid-cols-2 gap-4">
              {renderSizeSelect('Размер горе', sizeUpper, setSizeUpper)}
              {renderSizeSelect('Размер долу', sizeLower, setSizeLower)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const resolveDisplayAddress = (): { line1: string; line2: string } => {
    if (isAuthenticated && !isAdmin && selectedAddressId && !showNewAddressForm) {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        if (addr.delivery_method === 'speedy_office' && addr.speedy_office_name) {
          return {
            line1: `📦 Офис на Speedy: ${addr.speedy_office_name}`,
            line2: addr.speedy_office_address ?? '',
          };
        }
        const parts: string[] = [];
        if (addr.street_address) parts.push(addr.street_address);
        if (addr.building_entrance) parts.push(`Вход ${addr.building_entrance}`);
        if (addr.floor) parts.push(`ет. ${addr.floor}`);
        if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
        return { line1: parts.join(', '), line2: `${addr.postal_code} ${addr.city}` };
      }
    }

    if (deliveryMethod === 'speedy_office' && speedyOffice) {
      return {
        line1: `📦 Офис на Speedy: ${speedyOffice.name}`,
        line2: speedyOffice.address,
      };
    }

    const parts: string[] = [];
    if (address.streetAddress) parts.push(address.streetAddress);
    if (address.buildingEntrance) parts.push(`Вход ${address.buildingEntrance}`);
    if (address.floor) parts.push(`ет. ${address.floor}`);
    if (address.apartment) parts.push(`ап. ${address.apartment}`);
    return { line1: parts.join(', '), line2: `${address.postalCode} ${address.city}` };
  };

  // ── Progress indicator ──────────────────────────────────────────────────
  const renderProgress = () => {
    const steps: ConversionStep[] = ['summary', 'details', 'confirm'];
    const labels = ['Преглед', 'Детайли', 'Потвърждение'];
    const currentIndex = steps.indexOf(step);

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => {
          const isActive = step === s;
          const isCompleted = i < currentIndex;

          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 ${
                    isCompleted || isActive ? 'bg-[var(--color-brand-orange)]' : 'bg-gray-200'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive
                      ? 'bg-[var(--color-brand-orange)] text-white'
                      : isCompleted
                        ? 'bg-[var(--color-brand-orange)]/20 text-[var(--color-brand-orange)]'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-[var(--color-brand-orange)]' : 'text-gray-500'
                  }`}
                >
                  {labels[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Success state (guests / admin) ──────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-lg text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-brand-navy)] mb-4">
            Абонаментът ти е активен!
          </h2>
          {isAdmin ? (
            <p className="text-gray-600">
              Абонаментът за <span className="font-semibold">{source.customerFullName}</span> ({source.customerEmail}) е създаден успешно.
            </p>
          ) : (
            <>
              <p className="text-gray-600 mb-2">
                Изпратихме потвърждение и линк за настройка на акаунта ти на{' '}
                <span className="font-semibold">{source.customerEmail}</span>.
              </p>
              <p className="text-gray-500 text-sm">
                С акаунта си ще можеш да управляваш абонамента, да променяш предпочитанията си и да следиш доставките.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Loading gate ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-brand-orange)]" />
      </div>
    );
  }

  // ======================================================================
  // STEP 1: Summary + Frequency
  // ======================================================================
  if (step === 'summary') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {renderProgress()}

        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Конвертиране към абонамент
        </h1>

        {/* Order summary card */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
          <div className="border-b pb-3 mb-4">
            <p className="text-sm text-gray-500">
              Поръчка <span className="font-semibold">#{source.orderNumber}</span>
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold text-[var(--color-brand-navy)]">{boxLabel}</p>
                {source.wantsPersonalization && (
                  <p className="text-sm text-gray-500 mt-1">С персонализация</p>
                )}
              </div>
              {/* Price display */}
              <div className="text-right">
                {priceInfo.discountPercent > 0 ? (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400 line-through">
                      {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
                    </div>
                    <div className="text-lg font-bold text-[var(--color-brand-orange)]">
                      {formatPriceDual(priceInfo.finalPriceEur, priceInfo.finalPriceBgn)}
                    </div>
                    <div className="text-xs text-green-600 font-semibold">
                      -{priceInfo.discountPercent}% отстъпка
                    </div>
                  </div>
                ) : (
                  <div className="text-lg font-bold text-[var(--color-brand-navy)]">
                    {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
                  </div>
                )}
              </div>
            </div>

            {/* Campaign promo badge */}
            {source.campaignPromoCode && priceInfo.discountPercent > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Код {source.campaignPromoCode} приложен — {priceInfo.discountPercent}% отстъпка
              </div>
            )}
          </div>
        </div>

        {/* Frequency picker */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
            Честота на доставка <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['monthly', 'seasonal'] as const).map((freq) => {
              const isSelected = frequency === freq;
              return (
                <button
                  key={freq}
                  type="button"
                  onClick={() => {
                    setFrequency(freq);
                    setFrequencyError(false);
                  }}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'border-[var(--color-brand-orange)] bg-[var(--color-brand-orange)]/5'
                      : 'border-gray-300 hover:border-[var(--color-brand-orange)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-orange)]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-brand-navy)]">
                        {freq === 'monthly' ? 'Месечен' : 'Сезонен'}
                      </p>
                      <p className="text-sm text-gray-500">{FREQUENCY_LABELS[freq]}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {frequencyError && (
            <p className="text-red-500 text-sm mt-2">Моля, изберете честота на доставка.</p>
          )}
        </div>

        {/* Next button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleSummaryNext}
            className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Напред
          </button>
        </div>
      </div>
    );
  }

  // ======================================================================
  // STEP 2: Contact + Address
  // ======================================================================
  if (step === 'details') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {renderProgress()}

        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Данни за доставка
        </h2>

        <div className="space-y-6">
          {/* Path C: Admin flow */}
          {isAdmin && (
            <AdminCustomerPanel
              defaultFullName={source.customerFullName}
              defaultEmail={source.customerEmail}
            />
          )}

          {/* Admin: wait for account before showing address */}
          {isAdmin && !onBehalfOfUserId && (
            <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm">Моля, създайте или свържете акаунт на клиента, за да продължите.</p>
            </div>
          )}

          {/* Contact info — guest or admin after account creation */}
          {(!isAuthenticated || (isAdmin && onBehalfOfUserId)) && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                Данни за контакт
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {renderField('Имена', 'fullName', fullName, setFullName, true, contactErrors)}
                {renderField('Имейл', 'email', source.customerEmail, () => {}, true, contactErrors, {
                  type: 'email',
                  readOnly: true,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ),
                  hint: 'Имейлът е потвърден чрез линка',
                })}
                {renderField('Телефон', 'phone', phone, setPhone, true, contactErrors, { type: 'tel' })}
              </div>
            </div>
          )}

          {/* Authenticated (non-admin): greeting */}
          {isAuthenticated && !isAdmin && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <p className="text-base sm:text-lg text-[var(--color-brand-navy)]">
                Здравейте, <span className="font-bold">{user?.fullName}</span>
              </p>
            </div>
          )}

          {/* Address section */}
          {(!isAdmin || onBehalfOfUserId) && (
            <>
              {isAuthenticated && !isAdmin ? (
                // Authenticated: saved address picker
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                    Адрес за доставка
                  </h3>
                  {renderSavedAddresses()}
                </div>
              ) : (
                // Guest or admin: delivery method + inline address
                <>
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                      Метод на доставка
                    </h3>
                    <DeliveryMethodToggle value={deliveryMethod} onChange={handleDeliveryMethodChange} />
                  </div>
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                      {deliveryMethod === 'speedy_office' ? 'Данни за получаване' : 'Адрес за доставка'}
                    </h3>
                    {deliveryMethod === 'speedy_office' ? renderOfficeForm() : renderAddressForm()}
                  </div>
                </>
              )}

              {/* Personalization overrides */}
              {source.wantsPersonalization && renderPersonalizationOverrides()}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 sm:gap-4 justify-center mt-6 sm:mt-8">
          <button
            onClick={() => setStep('summary')}
            className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
          {(!isAdmin || onBehalfOfUserId) && (
            <button
              onClick={handleDetailsNext}
              className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Напред
            </button>
          )}
        </div>
      </div>
    );
  }

  // ======================================================================
  // STEP 3: Confirmation
  // ======================================================================
  const displayAddress = resolveDisplayAddress();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {renderProgress()}

      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
        Потвърждение
      </h2>

      <div className="space-y-4 sm:space-y-6 mb-8">
        {/* Admin: on-behalf banner */}
        {isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            Поръчка от името на: <span className="font-semibold">{source.customerFullName}</span> ({source.customerEmail})
          </div>
        )}

        {/* Box Type + Frequency */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-start mb-3 border-b pb-2">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">Абонамент</h3>
            <button
              onClick={() => setStep('summary')}
              className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
            >
              Редактирай
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">{boxLabel}</p>
              <p className="text-sm text-gray-500 mt-1">
                {frequency ? FREQUENCY_LABELS[frequency] : ''}
              </p>
            </div>
            <div className="text-right">
              {priceInfo.discountPercent > 0 ? (
                <div className="space-y-1">
                  <div className="text-sm text-gray-400 line-through">
                    {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
                  </div>
                  <div className="text-lg font-bold text-[var(--color-brand-orange)]">
                    {formatPriceDual(priceInfo.finalPriceEur, priceInfo.finalPriceBgn)}
                  </div>
                </div>
              ) : (
                <div className="text-lg font-bold text-[var(--color-brand-navy)]">
                  {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
                </div>
              )}
            </div>
          </div>
          {source.campaignPromoCode && priceInfo.discountPercent > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium mt-3">
              Код {source.campaignPromoCode} — {priceInfo.discountPercent}% отстъпка
            </div>
          )}
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-start mb-3 border-b pb-2">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">Адрес</h3>
            <button
              onClick={() => setStep('details')}
              className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
            >
              Редактирай
            </button>
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-semibold">{address.fullName || fullName}</p>
            {displayAddress.line1 && <p className="mt-1">{displayAddress.line1}</p>}
            {displayAddress.line2 && <p>{displayAddress.line2}</p>}
          </div>
        </div>

        {/* Personalization summary */}
        {source.wantsPersonalization && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex justify-between items-start mb-3 border-b pb-2">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">Персонализация</h3>
              <button
                onClick={() => setStep('details')}
                className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
              >
                Редактирай
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              {sports.length > 0 && (
                <p>
                  <span className="font-medium">Спорт:</span>{' '}
                  {sports.map((v) => catalogData.labels.sports[v] ?? v).join(', ')}
                </p>
              )}
              {colors.length > 0 && (
                <p>
                  <span className="font-medium">Цветове:</span>{' '}
                  {colors.map((v) => catalogData.labels.colors[v] ?? v).join(', ')}
                </p>
              )}
              {flavors.length > 0 && (
                <p>
                  <span className="font-medium">Вкусове:</span>{' '}
                  {flavors.map((v) => catalogData.labels.flavors[v] ?? v).join(', ')}
                </p>
              )}
              {dietary.length > 0 && (
                <p>
                  <span className="font-medium">Диетични:</span>{' '}
                  {dietary.map((v) => catalogData.labels.dietary[v] ?? v).join(', ')}
                </p>
              )}
              {(sizeUpper || sizeLower) && (
                <p>
                  <span className="font-medium">Размери:</span>{' '}
                  {[
                    sizeUpper && `Горе: ${catalogData.labels.sizes[sizeUpper] ?? sizeUpper}`,
                    sizeLower && `Долу: ${catalogData.labels.sizes[sizeLower] ?? sizeLower}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{submitError}</div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 sm:gap-4 justify-center">
        <button
          onClick={() => setStep('details')}
          className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
        >
          Назад
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Обработване...' : 'Потвърди абонамент'}
        </button>
      </div>
    </div>
  );
}
