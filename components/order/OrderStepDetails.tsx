'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { trackFunnelStep, trackFormInteraction } from '@/lib/analytics';
import { isValidEmail, isValidPhone, getEmailError, getPhoneError } from '@/lib/catalog';
import { isSubscriptionBox } from '@/lib/catalog';
import { getAddressFieldError, validateAddress, validateSpeedyOffice } from '@/lib/order';
import type { AddressInput, DeliveryMethod, SpeedyOfficeSelection } from '@/lib/order';
import DeliveryMethodToggle from './DeliveryMethodToggle';
import SpeedyOfficeSelector from './SpeedyOfficeSelector';
import AdminCustomerPanel from './AdminCustomerPanel';
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
  const onBehalfOfUserId = useOrderStore((s) => s.onBehalfOfUserId);
  const conversionToken = useOrderStore((s) => s.conversionToken);
  const hasTrackedStep = useRef(false);

  // Track funnel step on mount
  useEffect(() => {
    if (!hasTrackedStep.current) {
      trackFunnelStep('contact_info', 3);
      hasTrackedStep.current = true;
    }
  }, []);

  const isSubscription = isSubscriptionBox(store.boxType);
  const isAdminUser = isAuthenticated && user?.userType === 'staff'
    && (user?.staffRole === 'admin' || user?.staffRole === 'super_admin');

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

  // Delivery method state
  const [deliveryMethod, setDeliveryMethodLocal] = useState<DeliveryMethod>(store.deliveryMethod);
  const [speedyOffice, setSpeedyOfficeLocal] = useState<SpeedyOfficeSelection | null>(store.speedyOffice);
  const [officeError, setOfficeError] = useState<string | null>(null);

  // Track whether the guest has directly edited the address name/phone fields.
  // When untouched, these are auto-synced from the contact section above.
  const addressNameTouched = useRef(false);
  const addressPhoneTouched = useRef(false);

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

  // Pre-fill contact info from auth profile — but NOT during a conversion
  // flow where the store already holds the customer's details from the
  // preorder. We check conversionToken (set synchronously at prefill) rather
  // than onBehalfOfUserId (set asynchronously after a lookup/create call).
  useEffect(() => {
    if (isAuthenticated && user && !conversionToken) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');

      // Also seed the address recipient name and phone so the delivery form
      // isn't blank. Only overwrite if the user hasn't already typed something.
      setAddressLocal(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [isAuthenticated, user, conversionToken]);

  // Guest flow: sync contact name/phone into the address recipient fields
  // as the user types, so they don't have to enter the same info twice.
  // Stops syncing once the address field has been directly edited.
  useEffect(() => {
    if (!isAuthenticated && isGuest) {
      setAddressLocal(prev => {
        const next = { ...prev };
        if (!addressNameTouched.current) next.fullName = fullName;
        if (!addressPhoneTouched.current) next.phone = phone;
        return next;
      });
    }
  }, [isAuthenticated, isGuest, fullName, phone]);

  // Address field change handler
  const handleAddressChange = useCallback((field: keyof AddressInput, value: string) => {
    // Mark address name/phone as directly edited so auto-sync stops
    if (field === 'fullName') addressNameTouched.current = true;
    if (field === 'phone') addressPhoneTouched.current = true;
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

  // Delivery method change handler
  const handleDeliveryMethodChange = useCallback((method: DeliveryMethod) => {
    setDeliveryMethodLocal(method);
    setOfficeError(null);
    // Clear address errors when switching
    setAddressErrors({});
    setHasAttemptedSubmit(false);
  }, []);

  // Speedy office selection handler
  const handleOfficeSelect = useCallback((office: SpeedyOfficeSelection) => {
    setSpeedyOfficeLocal(office);
    setOfficeError(null);
  }, []);

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
    // Admin on-behalf: require customer account to be set
    if (isSubscription && isAdminUser && !onBehalfOfUserId) {
      return;
    }

    // Admin converting a non-subscription box without creating a customer
    // account → treat as a guest order so the admin's own userId is not used.
    const isAdminGuestConversion = isAdminUser && conversionToken && !isSubscription && !onBehalfOfUserId;

    // Resolve the correct contact info to persist.
    // When admin acts on behalf of a customer, name/email were set by
    // AdminCustomerPanel directly on the store, and phone comes from the
    // address form (the admin on-behalf UI has no separate phone field).
    // For admin guest conversions, use the conversion source's customer data
    // already held in the local state (prefilled from the store).
    const resolveContact = (): [string, string, string] => {
      if (onBehalfOfUserId) {
        const s = useOrderStore.getState();
        return [s.fullName, s.email, address.phone.trim()];
      }
      return [fullName.trim(), email.trim(), phone.trim()];
    };

    // --- SPEEDY OFFICE DELIVERY ---
    if (deliveryMethod === 'speedy_office') {
      // Validate office selection + required fields (fullName, phone)
      const officeResult = validateSpeedyOffice(address, speedyOffice);
      if (!officeResult.valid) {
        const errors: Record<string, string> = {};
        officeResult.errors.forEach(e => {
          if (e.field === 'speedyOffice') {
            setOfficeError(e.message);
          } else {
            errors[e.field] = e.message;
          }
        });
        setAddressErrors(errors);
        return;
      }

      // Guest: also validate contact info
      if (!isAuthenticated && isGuest) {
        const contactValid = validateContactInfo();
        if (!contactValid) return;
        store.setGuestMode(true);
        store.setContactInfo(...resolveContact());
      } else if (isAdminGuestConversion) {
        // Admin converting without account → guest order with customer's info
        store.setGuestMode(true);
        store.setContactInfo(...resolveContact());
      } else if (isAuthenticated) {
        store.setGuestMode(false);
        store.setContactInfo(...resolveContact());
      }

      store.setDeliveryMethod('speedy_office');
      store.setSpeedyOffice(speedyOffice);
      store.setSelectedAddressId(null);
      store.setAddress({
        fullName: address.fullName,
        phone: address.phone,
      });
      onNext();
      return;
    }

    // --- ADDRESS DELIVERY (existing logic) ---
    if (!isAuthenticated && isGuest) {
      // Branch B: Guest checkout
      const contactValid = validateContactInfo();
      const addressValid = validateAddressForm();
      if (!contactValid || !addressValid) return;

      store.setGuestMode(true);
      store.setContactInfo(...resolveContact());
      store.setSelectedAddressId(null);
      store.setDeliveryMethod('address');
      store.setSpeedyOffice(null);
      store.setAddress(address);
      onNext();
    } else if (isAdminGuestConversion) {
      // Admin converting without account → guest order with customer's info
      const addressValid = validateAddressForm();
      if (!addressValid) return;

      store.setGuestMode(true);
      store.setContactInfo(...resolveContact());
      store.setSelectedAddressId(null);
      store.setDeliveryMethod('address');
      store.setSpeedyOffice(null);
      store.setAddress(address);
      onNext();
    } else if (isAuthenticated) {
      // Branch C: Authenticated
      if (selectedAddressId && !showNewAddressForm) {
        store.setGuestMode(false);
        store.setContactInfo(...resolveContact());
        store.setSelectedAddressId(selectedAddressId);
        store.setDeliveryMethod('address');
        store.setSpeedyOffice(null);
        onNext();
      } else {
        const addressValid = validateAddressForm();
        if (!addressValid) return;

        store.setGuestMode(false);
        store.setContactInfo(...resolveContact());
        store.setSelectedAddressId(null);
        store.setDeliveryMethod('address');
        store.setSpeedyOffice(null);
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

  // Speedy office delivery form
  const renderOfficeForm = () => (
    <div className="space-y-3 sm:space-y-4">
      {/* Name + Phone (required for Speedy) */}
      {renderField('Име на получател', 'fullName', address.fullName, (v) => handleAddressChange('fullName', v), true, addressErrors)}
      {renderField('Телефон', 'phone', address.phone, (v) => handleAddressChange('phone', v), true, addressErrors, 'tel')}

      {/* Speedy Office Widget */}
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

      {/* Optional delivery notes */}
      {renderField('Бележки за доставка', 'deliveryNotes', address.deliveryNotes, (v) => handleAddressChange('deliveryNotes', v), false, addressErrors, 'text', 'Напр. позвънете преди доставка...', 500)}
    </div>
  );

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
  // Branch A0: Subscription + admin on-behalf-of flow
  // =========================================================================
  if (isSubscription && isAdminUser) {
    return (
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Данни за доставка
        </h2>

        {/* Admin: Create or link customer account */}
        <AdminCustomerPanel
          defaultFullName={store.fullName}
          defaultEmail={store.email}
        />

        {/* Show address form only after customer account is set */}
        {onBehalfOfUserId ? (
          <>
            {/* Delivery Method Toggle */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-6 mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                Метод на доставка
              </h3>
              <DeliveryMethodToggle value={deliveryMethod} onChange={handleDeliveryMethodChange} />
            </div>

            {/* Address / Office Form */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                {deliveryMethod === 'speedy_office' ? 'Данни за получаване' : 'Адрес за доставка'}
              </h3>
              {deliveryMethod === 'speedy_office' ? renderOfficeForm() : renderAddressForm()}
            </div>

            {/* Navigation buttons */}
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
          </>
        ) : (
          <>
            <div className="text-center text-gray-500 mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm">Моля, създайте или свържете акаунт на клиента, за да продължите.</p>
            </div>

            {/* Back button (always visible) */}
            <div className="flex justify-center mt-6">
              <button
                onClick={onBack}
                className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
              >
                Назад
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // Branch A0b: Non-subscription + admin conversion (optional account)
  // =========================================================================
  if (!isSubscription && isAdminUser && conversionToken) {
    return (
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Данни за доставка
        </h2>

        {/* Admin: Optional account creation */}
        <AdminCustomerPanel
          defaultFullName={store.fullName}
          defaultEmail={store.email}
          optional
        />

        {/* Address form always visible (account not required) */}
        <div className="space-y-6 sm:space-y-8 mt-6">
          {/* Delivery Method Toggle */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
              Метод на доставка
            </h3>
            <DeliveryMethodToggle value={deliveryMethod} onChange={handleDeliveryMethodChange} />
          </div>

          {/* Address / Office Form */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
              {deliveryMethod === 'speedy_office' ? 'Данни за получаване' : 'Адрес за доставка'}
            </h3>
            {deliveryMethod === 'speedy_office' ? renderOfficeForm() : renderAddressForm()}
          </div>
        </div>

        {/* Navigation buttons */}
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

            {/* Delivery Method Toggle */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                Метод на доставка
              </h3>
              <DeliveryMethodToggle value={deliveryMethod} onChange={handleDeliveryMethodChange} />
            </div>

            {/* Address / Office Form */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
                {deliveryMethod === 'speedy_office' ? 'Данни за получаване' : 'Адрес за доставка'}
              </h3>
              {deliveryMethod === 'speedy_office' ? renderOfficeForm() : renderAddressForm()}
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

      {/* Delivery Method Toggle */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
          Метод на доставка
        </h3>
        <DeliveryMethodToggle value={deliveryMethod} onChange={handleDeliveryMethodChange} />
      </div>

      {/* Address section - only show when delivery method is 'address' */}
      {deliveryMethod === 'address' ? (
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
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-4 border-b pb-2">
            Данни за получаване
          </h3>
          {renderOfficeForm()}
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
