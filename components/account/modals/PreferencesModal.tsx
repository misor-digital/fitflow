'use client';

import { useState } from 'react';
import type { SubscriptionWithDelivery } from '@/lib/subscription';
import type { CatalogData, BoxTypeId } from '@/lib/catalog';
import { isPremiumBox } from '@/lib/catalog';

interface PreferencesModalProps {
  subscriptionId: string;
  subscription: SubscriptionWithDelivery;
  catalogOptions: CatalogData;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PreferencesModal({
  subscriptionId,
  subscription,
  catalogOptions,
  onSuccess,
  onClose,
}: PreferencesModalProps) {
  const isPremium = isPremiumBox(subscription.box_type as BoxTypeId);

  // Local form state initialized from subscription
  const [wantsPersonalization, setWantsPersonalization] = useState(subscription.wants_personalization);
  const [sports, setSports] = useState<string[]>(subscription.sports ?? []);
  const [sportOther, setSportOther] = useState(subscription.sport_other ?? '');
  const [colors, setColors] = useState<string[]>(subscription.colors ?? []);
  const [flavors, setFlavors] = useState<string[]>(subscription.flavors ?? []);
  const [flavorOther, setFlavorOther] = useState(subscription.flavor_other ?? '');
  const [dietary, setDietary] = useState<string[]>(subscription.dietary ?? []);
  const [dietaryOther, setDietaryOther] = useState(subscription.dietary_other ?? '');
  const [sizeUpper, setSizeUpper] = useState(subscription.size_upper ?? '');
  const [sizeLower, setSizeLower] = useState(subscription.size_lower ?? '');
  const [notes, setNotes] = useState(subscription.additional_notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('sports');

  const sportsOptions = catalogOptions.options?.sports ?? [];
  const colorsOptions = catalogOptions.options?.colors ?? [];
  const flavorsOptions = catalogOptions.options?.flavors ?? [];
  const dietaryOptions = catalogOptions.options?.dietary ?? [];
  const sizesOptions = catalogOptions.options?.sizes ?? [];

  const toggleItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter((i) => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const preferences = {
        wants_personalization: wantsPersonalization,
        sports: sports.length > 0 ? sports : null,
        sport_other: sportOther || null,
        colors: colors.length > 0 ? colors : null,
        flavors: flavors.length > 0 ? flavors : null,
        flavor_other: flavorOther || null,
        dietary: dietary.length > 0 ? dietary : null,
        dietary_other: dietaryOther || null,
        size_upper: sizeUpper || null,
        size_lower: sizeLower || null,
        additional_notes: notes || null,
      };

      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_preferences', preferences }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-xl">
          <h2 className="text-lg font-semibold text-[var(--color-brand-navy)]">
            Промяна на предпочитания
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Промените ще се отразят в следващата доставка.
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Personalization toggle */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-gray-700">Искам персонализация</span>
            <button
              type="button"
              role="switch"
              aria-checked={wantsPersonalization}
              onClick={() => setWantsPersonalization(!wantsPersonalization)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                wantsPersonalization ? 'bg-[var(--color-brand-orange)]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  wantsPersonalization ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {wantsPersonalization && (
            <>
              {/* Sports Section */}
              <AccordionSection
                title="Спорт"
                isOpen={expandedSection === 'sports'}
                onToggle={() => toggleSection('sports')}
                badge={sports.length > 0 ? `${sports.length}` : undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {sportsOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleItem(sports, opt.id, setSports)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        sports.includes(opt.id)
                          ? 'bg-[var(--color-brand-orange)] text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {sports.includes('other') && (
                  <input
                    type="text"
                    value={sportOther}
                    onChange={(e) => setSportOther(e.target.value)}
                    placeholder="Друг спорт..."
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
                  />
                )}
              </AccordionSection>

              {/* Flavors Section */}
              <AccordionSection
                title="Вкусове"
                isOpen={expandedSection === 'flavors'}
                onToggle={() => toggleSection('flavors')}
                badge={flavors.length > 0 ? `${flavors.length}` : undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {flavorsOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleItem(flavors, opt.id, setFlavors)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        flavors.includes(opt.id)
                          ? 'bg-[var(--color-brand-orange)] text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {flavors.includes('other') && (
                  <input
                    type="text"
                    value={flavorOther}
                    onChange={(e) => setFlavorOther(e.target.value)}
                    placeholder="Друг вкус..."
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
                  />
                )}
              </AccordionSection>

              {/* Dietary Section */}
              <AccordionSection
                title="Хранителен режим"
                isOpen={expandedSection === 'dietary'}
                onToggle={() => toggleSection('dietary')}
                badge={dietary.length > 0 ? `${dietary.length}` : undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleItem(dietary, opt.id, setDietary)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        dietary.includes(opt.id)
                          ? 'bg-[var(--color-brand-orange)] text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {dietary.includes('other') && (
                  <input
                    type="text"
                    value={dietaryOther}
                    onChange={(e) => setDietaryOther(e.target.value)}
                    placeholder="Друг хранителен режим..."
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
                  />
                )}
              </AccordionSection>

              {/* Colors Section (premium only) */}
              {isPremium && (
                <AccordionSection
                  title="Цветове"
                  isOpen={expandedSection === 'colors'}
                  onToggle={() => toggleSection('colors')}
                  badge={colors.length > 0 ? `${colors.length}` : undefined}
                >
                  <div className="flex flex-wrap gap-2">
                    {colorsOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleItem(colors, opt.hex, setColors)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          colors.includes(opt.hex)
                            ? 'bg-[var(--color-brand-orange)] text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-gray-200"
                          style={{ backgroundColor: opt.hex }}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </AccordionSection>
              )}

              {/* Sizes Section (premium only) */}
              {isPremium && (
                <AccordionSection
                  title="Размери"
                  isOpen={expandedSection === 'sizes'}
                  onToggle={() => toggleSection('sizes')}
                  badge={sizeUpper || sizeLower ? '✓' : undefined}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Горна част</label>
                      <select
                        value={sizeUpper}
                        onChange={(e) => setSizeUpper(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
                      >
                        <option value="">Избери...</option>
                        {sizesOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Долна част</label>
                      <select
                        value={sizeLower}
                        onChange={(e) => setSizeLower(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
                      >
                        <option value="">Избери...</option>
                        {sizesOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </AccordionSection>
              )}

              {/* Notes Section */}
              <AccordionSection
                title="Допълнителни бележки"
                isOpen={expandedSection === 'notes'}
                onToggle={() => toggleSection('notes')}
                badge={notes ? '✓' : undefined}
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Споделете допълнителни предпочитания..."
                  maxLength={1000}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent resize-none"
                />
              </AccordionSection>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-xl">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-orange)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Запазване...' : 'Запази'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Accordion Section sub-component
// ============================================================================

function AccordionSection({
  title,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {badge && (
            <span className="bg-[var(--color-brand-orange)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
