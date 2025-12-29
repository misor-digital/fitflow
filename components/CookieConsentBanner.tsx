'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useConsentStore } from '@/lib/consent';

/**
 * Cookie consent banner component
 * Shows on first visit and when consent version changes
 * GDPR compliant with explicit opt-in for non-essential cookies
 */
export default function CookieConsentBanner() {
  const {
    isLoaded,
    showBanner,
    showPreferences,
    preferences,
    initialize,
    acceptAll,
    rejectNonEssential,
    savePreferences,
    openPreferences,
    closePreferences,
  } = useConsentStore();

  // Local state for preference toggles
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  
  // Track previous showPreferences value to detect when modal opens
  const prevShowPreferencesRef = useRef(showPreferences);

  // Initialize consent state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync local state when modal opens - using ref comparison to avoid effect setState
  useEffect(() => {
    // Only sync when modal opens (transition from false to true)
    if (showPreferences && !prevShowPreferencesRef.current) {
      setAnalyticsEnabled(preferences.analytics);
      setMarketingEnabled(preferences.marketing);
    }
    prevShowPreferencesRef.current = showPreferences;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreferences]);

  // Don't render until loaded (prevents hydration mismatch)
  if (!isLoaded) return null;

  // Don't show if banner is hidden and preferences modal is closed
  if (!showBanner && !showPreferences) return null;

  const handleSavePreferences = () => {
    savePreferences({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
  };

  return (
    <>
      {/* Main Banner */}
      {showBanner && !showPreferences && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-[#FB7D00] shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Text */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#023047] mb-1">
                  🍪 Използваме бисквитки
                </h3>
                <p className="text-sm text-gray-600">
                  Използваме бисквитки за да осигурим правилното функциониране на сайта. 
                  Аналитичните и маркетинговите бисквитки се активират само с Вашето съгласие.{' '}
                  <Link href="/cookies" className="text-[#FB7D00] hover:underline font-medium">
                    Научете повече
                  </Link>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0">
                <button
                  onClick={openPreferences}
                  className="px-4 py-2 text-sm font-medium text-[#023047] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Настройки
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#FB7D00] hover:bg-[#e06d00] rounded-lg transition-colors"
                >
                  Приемам всички
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#023047]">
                  Настройки за бисквитки
                </h2>
                <button
                  onClick={closePreferences}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Затвори"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Изберете кои видове бисквитки да разрешите. Можете да промените настройките по всяко време.
              </p>
            </div>

            {/* Cookie Categories */}
            <div className="px-6 py-4 space-y-4">
              {/* Necessary - Always On */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#023047]">Задължителни</h3>
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                    Винаги активни
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Необходими за правилното функциониране на сайта. Не могат да бъдат изключени.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#023047]">Аналитични</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FB7D00]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FB7D00]"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  Помагат ни да разберем как използвате сайта, за да подобрим функционалността и съдържанието.
                </p>
              </div>

              {/* Marketing */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#023047]">Маркетингови</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingEnabled}
                      onChange={(e) => setMarketingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FB7D00]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FB7D00]"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  Използват се за персонализирани предложения и реклами, базирани на Вашите интереси.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={rejectNonEssential}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[#023047] border border-[#023047] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Само необходими
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#023047] hover:bg-[#012a3b] rounded-lg transition-colors"
                >
                  Запази избора
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#FB7D00] hover:bg-[#e06d00] rounded-lg transition-colors"
                >
                  Приемам всички
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                <Link href="/cookies" className="hover:underline">
                  Политика за бисквитки
                </Link>
                {' • '}
                <Link href="/privacy" className="hover:underline">
                  Поверителност
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
