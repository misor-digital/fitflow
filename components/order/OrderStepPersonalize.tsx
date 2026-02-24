'use client';

import { useState, useEffect, useRef } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { trackFunnelStep, trackPersonalizationChoice } from '@/lib/analytics';
import type { CatalogData, PersonalizationStep } from '@/lib/catalog';
import {
  isPremiumBox,
  getActivePersonalizationSteps,
  calculatePersonalizationProgress,
  validatePersonalizationStep,
  sortWithOtherAtEnd,
} from '@/lib/catalog';

interface OrderStepPersonalizeProps {
  catalogData: CatalogData;
  onNext: () => void;
  onBack: () => void;
}

export default function OrderStepPersonalize({ catalogData, onNext, onBack }: OrderStepPersonalizeProps) {
  const store = useOrderStore();
  const hasTrackedStep = useRef(false);

  // Track funnel step on mount
  useEffect(() => {
    if (!hasTrackedStep.current) {
      trackFunnelStep('personalization', 2);
      hasTrackedStep.current = true;
    }
  }, []);

  // Determine if box is premium using shared helper
  const isPremium = isPremiumBox(store.boxType);

  // Local state for each step
  const [wantsPersonalization, setWantsPersonalization] = useState<boolean | null>(store.wantsPersonalization);
  const [sports, setSports] = useState<string[]>(store.sports);
  const [sportOther, setSportOther] = useState(store.sportOther);
  const [colors, setColors] = useState<string[]>(store.colors);
  const [flavors, setFlavors] = useState<string[]>(store.flavors);
  const [flavorOther, setFlavorOther] = useState(store.flavorOther);
  const [sizeUpper, setSizeUpper] = useState(store.sizeUpper);
  const [sizeLower, setSizeLower] = useState(store.sizeLower);
  const [dietary, setDietary] = useState<string[]>(store.dietary);
  const [dietaryOther, setDietaryOther] = useState(store.dietaryOther);
  const [notes, setNotes] = useState(store.additionalNotes);

  // Get options from catalog data
  const sportsOptions = catalogData?.options?.sports || [];
  const colorsOptions = catalogData?.options?.colors || [];
  const flavorsOptions = catalogData?.options?.flavors || [];
  const dietaryOptions = catalogData?.options?.dietary || [];
  const sizesOptions = catalogData?.options?.sizes || [];

  // Compute active steps using shared helper
  const activeSteps = getActivePersonalizationSteps(wantsPersonalization, isPremium);
  const [currentStep, setCurrentStep] = useState(0);

  // Ensure current step is within valid range
  const validCurrentStep = Math.min(currentStep, Math.max(0, activeSteps.length - 1));

  // Calculate progress using shared helper
  const progress = wantsPersonalization !== null
    ? calculatePersonalizationProgress(currentStep, activeSteps.length)
    : 0;

  const toggleItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  // Build current input for validation
  const currentInput = {
    boxType: store.boxType,
    wantsPersonalization,
    sports,
    sportOther,
    colors,
    flavors,
    flavorOther,
    sizeUpper,
    sizeLower,
    dietary,
    dietaryOther,
    additionalNotes: notes,
    fullName: store.fullName,
    email: store.email,
    phone: store.phone,
    promoCode: store.promoCode,
  };

  // Validate current step using shared helper
  const validateStep = () => {
    const step = activeSteps[validCurrentStep] as PersonalizationStep;
    return validatePersonalizationStep(step, currentInput);
  };

  const saveToStore = () => {
    store.setPersonalization(wantsPersonalization!);
    store.setSports(sortWithOtherAtEnd(sports));
    store.setSportOther(sportOther);
    store.setColors(colors);
    store.setFlavors(sortWithOtherAtEnd(flavors));
    store.setFlavorOther(flavorOther);
    store.setSizes(sizeUpper, sizeLower);
    store.setDietary(sortWithOtherAtEnd(dietary));
    store.setDietaryOther(dietaryOther);
    store.setAdditionalNotes(notes);
  };

  const handleNext = () => {
    if (!validateStep()) return;

    // Special handling for personalization step
    if (activeSteps[currentStep] === 'personalization' && wantsPersonalization !== null) {
      if (activeSteps.length > 1) {
        setCurrentStep(1);
        window.scrollTo(0, 0);
      } else {
        handleSubmit();
      }
      return;
    }

    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    } else {
      onBack();
    }
  };

  const handleSubmit = () => {
    saveToStore();

    // Track personalization choice in GA4
    trackPersonalizationChoice({
      wants_personalization: wantsPersonalization!,
      sports: wantsPersonalization ? sports : undefined,
      colors: wantsPersonalization ? colors : undefined,
      flavors: wantsPersonalization ? flavors : undefined,
      dietary: wantsPersonalization ? dietary : undefined,
    });

    onNext();
  };

  const renderStep = () => {
    const step = activeSteps[validCurrentStep];

    switch (step) {
      case 'personalization':
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
              Предпочитания
            </h2>
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              {[
                { value: true, title: 'Да, ще споделя моите предпочитания', desc: 'Включва няколко въпроса, които ни помагат по-добре да разберем твоите предпочитания и нужди' },
                { value: false, title: 'Не, оставам загадка за вас', desc: null },
              ].map((option) => (
                <div
                  key={String(option.value)}
                  onClick={() => setWantsPersonalization(option.value)}
                  className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg cursor-pointer transition-all border-3 ${
                    wantsPersonalization === option.value
                      ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                      : 'border-transparent hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 flex-shrink-0 ${wantsPersonalization === option.value ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'}`}>
                      {wantsPersonalization === option.value && <div className="w-full h-full rounded-full bg-[var(--color-brand-orange)] scale-[0.5]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">{option.title}</div>
                      {option.desc && <div className="text-xs sm:text-sm text-gray-600">{option.desc}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'sport':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10">
              Какъв спорт практикуваш?
            </h2>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {sportsOptions.map((sport) => (
                <div
                  key={sport.id}
                  onClick={() => toggleItem(sports, sport.id, setSports)}
                  className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3 ${
                    sports.includes(sport.id)
                      ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${sports.includes(sport.id) ? 'border-[var(--color-brand-orange)] bg-[var(--color-brand-orange)]' : 'border-gray-300'}`}>
                      {sports.includes(sport.id) && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">
                      {sport.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {sports.includes('other') && (
              <div className="mt-3 sm:mt-4">
                <input
                  type="text"
                  value={sportOther}
                  onChange={(e) => setSportOther(e.target.value)}
                  placeholder="Кой спорт?"
                  className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
                    sports.includes('other') && !sportOther.trim()
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
                  }`}
                />
              </div>
            )}
          </div>
        );

      case 'colors':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10">
              Какви цветове обичаш да носиш?
            </h2>
            <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {colorsOptions.map((color) => (
                <div
                  key={color.id}
                  onClick={() => toggleItem(colors, color.hex, setColors)}
                  title={color.label}
                  className={`aspect-square rounded-lg sm:rounded-xl cursor-pointer transition-all shadow-md hover:scale-105 ${
                    colors.includes(color.hex) ? 'ring-2 sm:ring-4 ring-[var(--color-brand-orange)] ring-offset-1 sm:ring-offset-2' : ''
                  } ${color.hex === '#FFFFFF' ? 'border-2 border-gray-300' : ''} ${color.hex === '#FB7D00' && colors.includes(color.hex) ? 'ring-[var(--color-brand-navy)]' : ''}`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        );

      case 'flavors':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10">
              Кои вкусове ти допадат?
            </h2>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {flavorsOptions.map((flavor) => (
                <div
                  key={flavor.id}
                  onClick={() => toggleItem(flavors, flavor.id, setFlavors)}
                  className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3 ${
                    flavors.includes(flavor.id)
                      ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${flavors.includes(flavor.id) ? 'border-[var(--color-brand-orange)] bg-[var(--color-brand-orange)]' : 'border-gray-300'}`}>
                      {flavors.includes(flavor.id) && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">
                      {flavor.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {flavors.includes('other') && (
              <div className="mt-3 sm:mt-4">
                <input
                  type="text"
                  value={flavorOther}
                  onChange={(e) => setFlavorOther(e.target.value)}
                  placeholder="Кой вкус?"
                  className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
                    flavors.includes('other') && !flavorOther.trim()
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
                  }`}
                />
              </div>
            )}
          </div>
        );

      case 'size':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10">
              Какъв размер спортни дрехи носиш?
            </h2>
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-md">
                <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)] mb-3 sm:mb-4">Горна част:</div>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {sizesOptions.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSizeUpper(size.id)}
                      className={`px-4 sm:px-5 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${
                        sizeUpper === size.id
                          ? 'bg-[var(--color-brand-orange)] text-white'
                          : 'bg-gray-100 text-[var(--color-brand-navy)] hover:bg-gray-200'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-md">
                <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)] mb-3 sm:mb-4">Долна част:</div>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {sizesOptions.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSizeLower(size.id)}
                      className={`px-4 sm:px-5 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${
                        sizeLower === size.id
                          ? 'bg-[var(--color-brand-orange)] text-white'
                          : 'bg-gray-100 text-[var(--color-brand-navy)] hover:bg-gray-200'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'dietary':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10">
              Имаш ли хранителни ограничения?
            </h2>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {dietaryOptions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'none') {
                      setDietary(['none']);
                      setDietaryOther('');
                    } else {
                      const newDietary = dietary.filter(d => d !== 'none');
                      toggleItem(newDietary, item.id, setDietary);
                    }
                  }}
                  className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3 ${
                    dietary.includes(item.id)
                      ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${dietary.includes(item.id) ? 'border-[var(--color-brand-orange)] bg-[var(--color-brand-orange)]' : 'border-gray-300'}`}>
                      {dietary.includes(item.id) && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">
                      {item.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {dietary.includes('other') && (
              <div className="mt-3 sm:mt-4">
                <input
                  type="text"
                  value={dietaryOther}
                  onChange={(e) => setDietaryOther(e.target.value)}
                  placeholder="Какви ограничения?"
                  className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
                    dietary.includes('other') && !dietaryOther.trim()
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
                  }`}
                />
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10">
              Има ли нещо, което забравихме да попитаме, но искаш да добавиш?
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Напиши тук... (по желание)"
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-[var(--color-brand-orange)] focus:outline-none min-h-[120px] sm:min-h-[150px] text-sm sm:text-base text-[var(--color-brand-navy)]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Progress Bar */}
      <div className="bg-gray-200 h-1.5 sm:h-2 rounded-full mb-6 sm:mb-10 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[var(--color-brand-orange)] to-[#ff9a3d] h-full transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Content */}
      <div className="mb-6 sm:mb-10">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex gap-2 sm:gap-4 justify-center">
        <button
          onClick={handleBack}
          className="bg-gray-300 text-[var(--color-brand-navy)] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
        >
          Назад
        </button>
        <button
          onClick={handleNext}
          disabled={!validateStep()}
          className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Напред
        </button>
      </div>
    </div>
  );
}
