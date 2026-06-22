'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { isPremiumBox, sortWithOtherAtEnd } from '@/lib/catalog';
import type { CatalogOption, ColorOption } from '@/lib/catalog';
import { SportsQuestion, ColorsQuestion, FlavorsQuestion, NotesQuestion } from './PersonalizationQuestions';

interface SubscriptionPersonalizationProps {
  subscriptionId: string;
  /** Called after the user finishes (saved or declined) to navigate home. */
  onDone: () => void;
}

type Phase = 'cta' | 'questions';

export default function SubscriptionPersonalization({ subscriptionId, onDone }: SubscriptionPersonalizationProps) {
  const [phase, setPhase] = useState<Phase>('cta');
  const [sportsOptions, setSportsOptions] = useState<CatalogOption[]>([]);
  const [colorsOptions, setColorsOptions] = useState<ColorOption[]>([]);
  const [flavorsOptions, setFlavorsOptions] = useState<CatalogOption[]>([]);

  const [sports, setSports] = useState<string[]>([]);
  const [sportOther, setSportOther] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [flavorOther, setFlavorOther] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = isPremiumBox(useOrderStore.getState().boxType);

  const colorsRef = useRef<HTMLDivElement>(null);
  const flavorsRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  // Fetch option sets when the user opts into personalization
  useEffect(() => {
    if (phase !== 'questions') return;
    let cancelled = false;
    (async () => {
      try {
        const sets: ['sports' | 'colors' | 'flavors', (v: never) => void][] = [
          ['sports', setSportsOptions as (v: never) => void],
          ['flavors', setFlavorsOptions as (v: never) => void],
        ];
        if (isPremium) sets.push(['colors', setColorsOptions as (v: never) => void]);
        await Promise.all(
          sets.map(async ([optionSet, setter]) => {
            const res = await fetch(`/api/catalog?type=options&optionSet=${optionSet}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!cancelled && Array.isArray(data.options)) setter(data.options as never);
          }),
        );
      } catch {
        /* options simply won't render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, isPremium]);

  const toggle = (arr: string[], id: string, setter: (v: string[]) => void) => {
    setter(arr.includes(id) ? arr.filter((i) => i !== id) : [...arr, id]);
  };

  const handleSportToggle = (id: string) => {
    const wasEmpty = sports.length === 0;
    toggle(sports, id, setSports);
    if (wasEmpty && id !== 'other') scrollTo(isPremium ? colorsRef : flavorsRef);
  };

  const handleColorToggle = (hex: string) => {
    const wasEmpty = colors.length === 0;
    toggle(colors, hex, setColors);
    if (wasEmpty) scrollTo(flavorsRef);
  };

  const handleFlavorToggle = (id: string) => {
    const wasEmpty = flavors.length === 0;
    toggle(flavors, id, setFlavors);
    if (wasEmpty && id !== 'other') scrollTo(notesRef);
  };

  // Required-question completeness
  const sportsValid = sports.length > 0 && (!sports.includes('other') || sportOther.trim() !== '');
  const flavorsValid = flavors.length > 0 && (!flavors.includes('other') || flavorOther.trim() !== '');
  const colorsValid = !isPremium || colors.length > 0;
  const canSave = sportsValid && flavorsValid && colorsValid;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);

    // Merge the size/dietary chosen at creation (still held in the order
    // store) so the preferences update does not wipe them.
    const store = useOrderStore.getState();
    try {
      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_preferences',
          preferences: {
            wants_personalization: true,
            sports: sortWithOtherAtEnd(sports),
            sport_other: sportOther.trim() || null,
            colors: colors.length > 0 ? colors : null,
            flavors: sortWithOtherAtEnd(flavors),
            flavor_other: flavorOther.trim() || null,
            dietary: store.dietary.length > 0 ? sortWithOtherAtEnd(store.dietary) : null,
            dietary_other: store.dietaryOther.trim() || null,
            size_upper: store.sizeUpper || null,
            size_lower: store.sizeLower || null,
            additional_notes: notes.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Грешка при запазване на предпочитанията');
      }
      setSaved(true);
      scrollTo(submitRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // CTA phase — two choices
  // -------------------------------------------------------------------------
  if (phase === 'cta') {
    return (
      <div className="space-y-3 sm:space-y-4">
        <button
          onClick={() => setPhase('questions')}
          className="w-full bg-[#FB7D00] text-white py-3 sm:py-4 px-4 rounded-full text-sm sm:text-base font-semibold shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          Помогни да персонализираме твоята кутия (време: ~ 30 секунди)
        </button>
        <button
          onClick={onDone}
          className="w-full bg-white text-[var(--color-brand-navy)] border-2 border-gray-300 py-3 sm:py-4 px-4 rounded-full text-sm sm:text-base font-semibold hover:border-gray-400 transition-all"
        >
          Не желая персонализация
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Questions phase
  // -------------------------------------------------------------------------
  return (
    <div className="text-left space-y-10 sm:space-y-12">
      <SportsQuestion
        options={sportsOptions}
        sports={sports}
        sportOther={sportOther}
        onToggle={handleSportToggle}
        onChangeOther={setSportOther}
      />

      {isPremium && (
        <div ref={colorsRef} className="scroll-mt-24">
          <ColorsQuestion options={colorsOptions} colors={colors} onToggle={handleColorToggle} />
        </div>
      )}

      <div ref={flavorsRef} className="scroll-mt-24">
        <FlavorsQuestion
          options={flavorsOptions}
          flavors={flavors}
          flavorOther={flavorOther}
          onToggle={handleFlavorToggle}
          onChangeOther={setFlavorOther}
        />
      </div>

      <div ref={notesRef} className="scroll-mt-24">
        <NotesQuestion notes={notes} onChange={setNotes} />
      </div>

      <div ref={submitRef} className="scroll-mt-24">
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {saved ? (
          <button
            onClick={onDone}
            className="w-full bg-[#FB7D00] text-white py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Към начална страница
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full bg-[#FB7D00] text-white py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? 'Запазване...' : 'Запази предпочитанията'}
          </button>
        )}
      </div>
    </div>
  );
}
