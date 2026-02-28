'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrderStore } from '@/store/orderStore';

interface AdminCustomerPanelProps {
  /** Pre-filled from preorder data via order store */
  defaultFullName: string;
  defaultEmail: string;
  /** When true, account creation is optional — the admin can skip it */
  optional?: boolean;
}

type PanelStatus = 'checking' | 'ready' | 'exists' | 'created' | 'error';

export default function AdminCustomerPanel({
  defaultFullName,
  defaultEmail,
  optional = false,
}: AdminCustomerPanelProps) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<PanelStatus>('checking');
  const [_userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const lookupCustomer = useCallback(async (emailToCheck: string) => {
    setStatus('checking');
    try {
      const res = await fetch(
        `/api/admin/customer-lookup?email=${encodeURIComponent(emailToCheck.trim().toLowerCase())}`,
      );
      const data = await res.json();
      if (data.exists) {
        setUserId(data.userId);
        setStatus('exists');
        useOrderStore.getState().setOnBehalfOfUserId(data.userId);
        // Keep the order store's contact info in sync with the customer
        useOrderStore.getState().setContactInfo(
          fullName.trim(),
          emailToCheck.trim().toLowerCase(),
          '',
        );
      } else {
        setStatus('ready');
      }
    } catch {
      setStatus('ready'); // Lookup failed, allow manual creation
    }
  }, []);

  // On mount — auto-lookup
  useEffect(() => {
    if (!defaultEmail) {
      setStatus('ready');
      return;
    }
    lookupCustomer(defaultEmail);
  }, [defaultEmail, lookupCustomer]);

  async function handleCreate() {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Грешка при създаване на акаунт');
        return;
      }
      setUserId(data.userId);
      setStatus(data.alreadyExisted ? 'exists' : 'created');
      useOrderStore.getState().setOnBehalfOfUserId(data.userId);
      // Sync the (possibly edited) customer name/email back to the order store
      // so the confirmation step displays the customer's identity, not the admin's.
      useOrderStore.getState().setContactInfo(
        fullName.trim(),
        email.trim().toLowerCase(),
        '',
      );
    } catch {
      setError('Грешка при създаване на акаунт. Опитайте отново.');
    } finally {
      setIsCreating(false);
    }
  }

  function handleEmailBlur() {
    if (
      email.trim() &&
      email.trim().toLowerCase() !== defaultEmail.toLowerCase()
    ) {
      lookupCustomer(email);
    }
  }

  const isFieldReadOnly = status === 'exists' || status === 'created';
  const isFieldDisabled = status === 'checking';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--color-brand-navy)]">
          👤 Акаунт на клиента
          {optional && (
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              по избор
            </span>
          )}
        </h3>
        <StatusBadge status={status} />
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="admin-customer-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Име
          </label>
          <input
            id="admin-customer-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            readOnly={isFieldReadOnly}
            disabled={isFieldDisabled}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none text-[var(--color-brand-navy)] text-sm sm:text-base ${
              isFieldReadOnly
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : isFieldDisabled
                  ? 'bg-gray-50 text-gray-400 cursor-wait'
                  : 'bg-white'
            }`}
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="admin-customer-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Имейл
          </label>
          <input
            id="admin-customer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            readOnly={isFieldReadOnly}
            disabled={isFieldDisabled}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none text-[var(--color-brand-navy)] text-sm sm:text-base ${
              isFieldReadOnly
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : isFieldDisabled
                  ? 'bg-gray-50 text-gray-400 cursor-wait'
                  : 'bg-white'
            }`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4">
        {status === 'ready' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !email.trim() || !fullName.trim()}
              className="bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#e67100] transition-all disabled:opacity-50"
            >
              {isCreating ? 'Създаване...' : 'Създай акаунт'}
            </button>
            {optional && (
              <p className="text-sm text-gray-500">
                💡 Ако клиентът не иска акаунт, продължете директно с попълване на адреса по-долу.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status Badge                                                              */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: PanelStatus }) {
  switch (status) {
    case 'checking':
      return (
        <span className="text-gray-500 text-sm flex items-center gap-1.5">
          <Spinner />
          Проверяване...
        </span>
      );
    case 'exists':
      return (
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
          ✓ Акаунтът съществува
        </span>
      );
    case 'created':
      return (
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
          ✓ Акаунтът е създаден, имейл за парола е изпратен
        </span>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Spinner                                                                   */
/* -------------------------------------------------------------------------- */

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-gray-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
