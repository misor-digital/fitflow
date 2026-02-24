'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { trackFunnelStep, trackFormInteraction } from '@/lib/analytics';
import { isValidEmail, isValidPhone, getEmailError, getPhoneError } from '@/lib/preorder';
import { isSubscriptionBox } from '@/lib/preorder';
import { isValidPostalCode, getAddressFieldError, validateAddress } from '@/lib/order';
import type { AddressInput } from '@/lib/order';
import Link from 'next/link';

interface OrderStepDetailsProps {
  onNext: () => void;
  onBack: () => void;
}

/** Saved address shape from API */
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
  is_default: boolean;
}

export default function OrderStepDetails({ onNext, onBack }: OrderStepDetailsProps) {
  const store = useOrderStore();
  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const hasTrackedStep = useRef(false);

  // Track funnel step on mount
  useEffect(() => {
    if (!hasTrackedStep.current) {
      trackFunnelStep('contact_info', 3);
      hasTrackedStep.current = true;
    }
  }, []);

  const isSubscription = isSubscriptionBox(store.boxType);

  // Guest toggle state
  const [isGuest, setIsGuest] = useState(!isAuthenticated ? store.isGuest : false);

  // Contact info (for guest)
  const [fullName, setFullName] = useState(store.fullName);
  const [email, setEmail] = useState(store.email);
  const [phone, setPhone] = useState(store.phone);

  // Address form state
  const [address, setAddressLocal] = useState<AddressInput>(store.address);

  // Saved addresses (for authenticated users)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(store.selectedAddressId);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Validation state
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Fetch saved addresses for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();

    async function fetchAddresses() {
      try {
        setLoadingAddresses(true);
        const response = await fetch('/api/address', { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          const addrs: SavedAddress[] = data.addresses || [];
          setSavedAddresses(addrs);

          // Pre-select default address if none selected
          if (!selectedAddressId && addrs.length > 0) {
            const defaultAddr = addrs.find(a => a.is_default) || addrs[0];
            setSelectedAddressId(defaultAddr.id);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error fetching addresses:', err);
      } finally {
        setLoadingAddresses(false);
      }
    }

    fetchAddresses();
    return () => controller.abort();
  }, [isAuthenticated, selectedAddressId]);

  // Pre-fill contact info from auth profile
  useEffect(() => {
    if (isAuthenticated && user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
    }
  }, [isAuthenticated, user]);

  // Address field change handler
  const handleAddressChange = useCallback((field: keyof AddressInput, value: string) => {
    setAddressLocal(prev => ({ ...prev, [field]: value }));

    // Clear error on change
    if (hasAttemptedSubmit) {
      const error = getAddressFieldError(field, { ...address, [field]: value });
      setAddressErrors(prev => {
        const next = { ...prev };
        if (error) {
          next[field] = error;
        } else {
          delete next[field];
        }
        return next;
      });
    }
  }, [hasAttemptedSubmit, address]);

  // Validate contact info (guest only)
  const validateContactInfo = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Името трябва да е поне 2 символа';
    }
    if (!email.trim()) {
      errors.email = 'Имейл адресът е задължителен';
    } else if (!isValidEmail(email)) {
      errors.email = getEmailError(email) || 'Невалиден имейл адрес';
    }
    if (phone.trim() && !isValidPhone(phone)) {
      errors.phone = getPhoneError(phone) || 'Невалиден телефонен номер';
    }

    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, email, phone]);

  // Validate address form
  const validateAddressForm = useCallback((): boolean => {
    const result = validateAddress(address);
    if (!result.valid) {
      const errors: Record<string, string> = {};
      result.errors.forEach(e => {
        errors[e.field] = e.message;
      });
      setAddressErrors(errors);
      return false;
    }

    // Also check delivery notes length
    if (address.deliveryNotes.length > 500) {
      setAddressErrors({ deliveryNotes: 'Бележките не могат да надвишават 500 символа' });
      return false;
    }

    setAddressErrors({});
    return true;
  }, [address]);

  const handleContinue = () => {
    setHasAttemptedSubmit(true);

    // Branch A: Subscription + not authenticated → block
    if (isSubscription && !isAuthenticated) {
      return;
    }

    if (!isAuthenticated && isGuest) {
      // Branch B: Guest checkout
      const contactValid = validateContactInfo();
      const addressValid = validateAddressForm();
      if (!contactValid || !addressValid) return;

      store.setGuestMode(true);
      store.setContactInfo(fullName.trim(), email.trim(), phone.trim());
      store.setSelectedAddressId(null);
      store.setAddress(address);
      onNext();
    } else if (isAuthenticated) {
      // Branch C: Authenticated
      if (selectedAddressId && !showNewAddressForm) {
        // Using a saved address
        store.setGuestMode(false);
        store.setContactInfo(fullName.trim(), email.trim(), phone.trim());
        store.setSelectedAddressId(selectedAddressId);
        onNext();
      } else {
        // New address form
        const addressValid = validateAddressForm();
        if (!addressValid) return;

        store.setGuestMode(false);
        store.setContactInfo(fullName.trim(), email.trim(), phone.trim());
        store.setSelectedAddressId(null);
        store.setAddress(address);
        onNext();
      }
    }
  };

  // Input field component
  const renderField = (
    label: string,
    field: string,
    value: string,
    onChange: (val: string) => void,
    required: boolean,
    errorSource: Record<string, string>,
    type: string = 'text',
    placeholder?: string,
    maxLength?: number,
  ) => {
    const error = hasAttemptedSubmit ? errorSource[field] : undefined;
    return (
      <div>
        <label className="block text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {field === 'deliveryNotes' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={3}
            className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
              error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
            }`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
              error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
            }`}
            onBlur={() => {
              if (field === 'email' && email.trim()) {
                trackFormInteraction({ form_name: 'order_details', field_name: 'email', interaction_type: 'blur' });
              }
            }}
          />
        )}
        {error && <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>}
      </div>
    );
  };

  // Address form fields
  const renderAddressForm = () => (
    <div className="space-y-3 sm:space-y-4">
      {renderField('Име на получател', 'fullName', address.fullName, (v) => handleAddressChange('fullName', v), true, addressErrors)}
      {renderField('Телефон', 'phone', address.phone, (v) => handleAddressChange('phone', v), false, addressErrors, 'tel')}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {renderField('Град', 'city', address.city, (v) => handleAddressChange('city', v), true, addressErrors)}
        {renderField('Пощенски код', 'postalCode', address.postalCode, (v) => handleAddressChange('postalCode', v), true, addressErrors, 'text', '1000')}
      </div>
      {renderField('Адрес (улица, номер)', 'streetAddress', address.streetAddress, (v) => handleAddressChange('streetAddress', v), true, addressErrors)}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {renderField('Вход', 'buildingEntrance', address.buildingEntrance, (v) => handleAddressChange('buildingEntrance', v), false, addressErrors)}
        {renderField('Етаж', 'floor', address.floor, (v) => handleAddressChange('floor', v), false, addressErrors)}
        {renderField('Апартамент', 'apartment', address.apartment, (v) => handleAddressChange('apartment', v), false, addressErrors)}
      </div>
      {renderField('Бележки за доставка', 'deliveryNotes', address.deliveryNotes, (v) => handleAddressChange('deliveryNotes', v), false, addressErrors, 'text', 'Напр. звънец, код за вход...', 500)}
    </div>
  );

  // =========================================================================
  // Branch A: Subscription + not authenticated
  // =========================================================================
  if (isSubscription && !isAuthenticated) {
    return (
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Данни за доставка
        </h2>

        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-brand-navy)] mb-3">
            Абонаментните кутии изискват акаунт.
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Влез в акаунта си или създай нов, за да продължиш с абонамента.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?redirect=/order"
              className="bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-full font-semibold text-sm sm:text-base hover:bg-[#e67100] transition-all text-center"
            >
              Вход
            </Link>
            <Link
              href="/register?redirect=/order"
              className="bg-[var(--color-brand-navy)] text-white px-6 py-3 rounded-full font-semibold text-sm sm:text-base hover:bg-[#012a3f] transition-all text-center"
            >
              Регистрация
            </Link>
          </div>
        </div>

        {/* Back button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onBack}
            className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Branch B: One-time + not authenticated (guest checkout)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Данни за доставка
        </h2>

        {/* Guest / Login toggle */}
        <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => setIsGuest(true)}
            className={`flex-1 py-3 px-4 border-2 rounded-xl font-semibold text-sm sm:text-base transition-all ${
              isGuest
                ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-orange)]'
            }`}
          >
            Продължи като гост
          </button>
          <Link
            href="/login?redirect=/order"
            className={`flex-1 py-3 px-4 border-2 rounded-xl font-semibold text-sm sm:text-base transition-all text-center ${
              !isGuest
                ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)]'
                : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-navy)]'
            }`}
          >
            Вход в акаунт
          </Link>
        </div>

        {isGuest && (
          <div className="space-y-6 sm:space-y-8">
            {/* Contact Info */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                Данни за контакт
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {renderField('Имена', 'fullName', fullName, setFullName, true, contactErrors)}
                {renderField('Имейл', 'email', email, setEmail, true, contactErrors, 'email')}
                {renderField('Телефон', 'phone', phone, setPhone, false, contactErrors, 'tel')}
              </div>
            </div>

            {/* Address Form */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                Адрес за доставка
              </h3>
              {renderAddressForm()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 sm:gap-4 justify-center mt-6 sm:mt-8">
          <button
            onClick={onBack}
            className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
          {isGuest && (
            <button
              onClick={handleContinue}
              className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Напред
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Branch C: Authenticated user
  // =========================================================================
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
        Данни за доставка
      </h2>

      {/* Greeting */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
        <p className="text-base sm:text-lg text-[var(--color-brand-navy)]">
          Здравейте, <span className="font-bold">{user?.fullName}</span>
        </p>
      </div>

      {/* Address section */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
          Адрес за доставка
        </h3>

        {loadingAddresses ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-orange)]"></div>
          </div>
        ) : savedAddresses.length > 0 && !showNewAddressForm ? (
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
                  <div className={`mt-1 w-5 h-5 rounded-full border-3 flex-shrink-0 ${
                    selectedAddressId === addr.id ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'
                  }`}>
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
                    <div className="text-sm text-gray-600 mt-0.5">
                      {addr.street_address}
                      {addr.building_entrance && `, Вход ${addr.building_entrance}`}
                      {addr.floor && `, ет. ${addr.floor}`}
                      {addr.apartment && `, ап. ${addr.apartment}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {addr.postal_code} {addr.city}
                    </div>
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
        ) : (
          <div>
            {savedAddresses.length > 0 && showNewAddressForm && (
              <button
                onClick={() => setShowNewAddressForm(false)}
                className="text-sm text-[var(--color-brand-orange)] font-semibold mb-4 hover:underline"
              >
                ← Назад към запазените адреси
              </button>
            )}
            {renderAddressForm()}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 sm:gap-4 justify-center mt-6 sm:mt-8">
        <button
          onClick={onBack}
          className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
        >
          Назад
        </button>
        <button
          onClick={handleContinue}
          className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          Напред
        </button>
      </div>
    </div>
  );
}
