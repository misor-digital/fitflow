'use client';

import { useEffect, useCallback, useState } from 'react';
import type { SpeedyOfficeSelection } from '@/lib/order';

interface SpeedyOfficeSelectorProps {
  selectedOffice: SpeedyOfficeSelection | null;
  onSelect: (office: SpeedyOfficeSelection) => void;
  error?: string | null;
}

const WIDGET_URL = 'https://services.speedy.bg/office_locator_widget_v3/office_locator.php';
const WIDGET_ORIGIN = 'https://services.speedy.bg';

function buildWidgetSrc(): string {
  const params = new URLSearchParams({
    lang: 'bg',
    showOfficesList: 'true',
    pickUp: 'true',
    selectOfficeButtonCaption: 'Избери този офис',
  });
  return `${WIDGET_URL}?${params.toString()}`;
}

export default function SpeedyOfficeSelector({
  selectedOffice,
  onSelect,
  error,
}: SpeedyOfficeSelectorProps) {
  const [showWidget, setShowWidget] = useState(!selectedOffice);

  // Listen for postMessage from the Speedy widget
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Only accept messages from the Speedy origin
      if (event.origin !== WIDGET_ORIGIN) return;

      try {
        // The widget sends office data — extract what we need
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // The widget postMessage payload includes office details
        // Actual widget response has: siteId, siteName, fullAddressString, address (object), etc.
        if (data && (data.id || data.officeId || data.siteId)) {
          const office: SpeedyOfficeSelection = {
            id: String(data.id || data.officeId || data.siteId),
            name: data.name || data.officeName || data.siteName || '',
            address:
              typeof data.address === 'string'
                ? data.address
                : data.fullAddressString || data.fullAddress || data.address?.fullAddressString || '',
          };
          onSelect(office);
          setShowWidget(false);
        }
      } catch {
        // Ignore non-JSON messages or parse errors
      }
    },
    [onSelect],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Selected office display
  if (selectedOffice && !showWidget) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[var(--color-brand-orange)] uppercase tracking-wide mb-1">
                Избран офис
              </div>
              <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)]">
                {selectedOffice.name}
              </div>
              {selectedOffice.address && (
                <div className="text-sm text-gray-600 mt-0.5">
                  {selectedOffice.address}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowWidget(true)}
              className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline flex-shrink-0"
            >
              Промени
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Widget iframe
  return (
    <div className="space-y-3">
      {selectedOffice && (
        <button
          type="button"
          onClick={() => setShowWidget(false)}
          className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
        >
          ← Назад към избрания офис
        </button>
      )}
      <div
        className={`rounded-xl overflow-hidden border-2 ${
          error ? 'border-red-500' : 'border-gray-200'
        }`}
      >
        <iframe
          src={buildWidgetSrc()}
          width="100%"
          height="500"
          style={{ border: 'none', minHeight: '500px' }}
          title="Избор на офис на Speedy"
          allow="geolocation"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      {error && <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>}
    </div>
  );
}
