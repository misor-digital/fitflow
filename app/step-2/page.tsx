'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import Link from 'next/link';
import type { CatalogOption, ColorOption, PersonalizationStep } from '@/lib/preorder';
import { 
  isPremiumBox, 
  getActivePersonalizationSteps, 
  calculatePersonalizationProgress,
  validatePersonalizationStep,
  sortWithOtherAtEnd,
} from '@/lib/preorder';

interface CatalogData {
  options: {
    sports: CatalogOption[];
    colors: ColorOption[];
    flavors: CatalogOption[];
    dietary: CatalogOption[];
    sizes: CatalogOption[];
  };
  labels: {
    sports: Record<string, string>;
    colors: Record<string, string>;
    flavors: Record<string, string>;
    dietary: Record<string, string>;
    sizes: Record<string, string>;
  };
}

export default function Step2() {
  const router = useRouter();
  const store = useFormStore();
  
  // Catalog data from API
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Fetch catalog data from API
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setLoading(true);
        const response = await fetch('/api/catalog?type=all');
        if (!response.ok) {
          throw new Error('Failed to fetch catalog');
        }
        const data = await response.json();
        setCatalogData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching catalog:', err);
        setError('Грешка при зареждане. Моля, опитайте отново.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCatalog();
  }, []);

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

  const handleNext = () => {
    if (!validateStep()) return;
    
    // Special handling for personalization step - move to next step
    if (activeSteps[currentStep] === 'personalization' && wantsPersonalization !== null) {
      if (activeSteps.length > 1) {
        setCurrentStep(1);
        window.scrollTo(0, 0);
      } else {
        handleSubmit()
      }
      return;
    }
    
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit()
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    } else {
      router.push('/step-1');
    }
  };

  const handleSubmit = () => {
    // Save all data to store using shared helper for sorting
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
    
    router.push('/step-3');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FB7D00] mx-auto mb-4"></div>
          <p className="text-[#023047] font-semibold">Зареждане...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#FB7D00] text-white px-6 py-3 rounded-full font-semibold"
          >
            Опитай отново
          </button>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    const step = activeSteps[validCurrentStep];

    switch (step) {
      case 'personalization':
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#023047] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
              Персонализация
            </h2>
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              {[
                { value: true, title: 'Да, искам персонализация', desc: 'Включва няколко въпроса, които ни помагат по-добре да разберем твоите предпочитания и нужди' },
                { value: false, title: 'Не, оставям избора на вас', desc: null }
              ].map((option) => (
                <div
                  key={String(option.value)}
                  onClick={() => setWantsPersonalization(option.value)}
                  className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg cursor-pointer transition-all border-3 ${
                    wantsPersonalization === option.value
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 flex-shrink-0 ${wantsPersonalization === option.value ? 'border-[#FB7D00]' : 'border-gray-300'}`}>
                      {wantsPersonalization === option.value && <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-base sm:text-lg font-semibold text-[#023047] mb-0.5 sm:mb-1">{option.title}</div>
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] text-center mb-6 sm:mb-8 md:mb-10">
              Какъв спорт практикуваш?
            </h2>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {sportsOptions.map((sport) => (
                <div
                  key={sport.id}
                  onClick={() => toggleItem(sports, sport.id, setSports)}
                  className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3 ${
                    sports.includes(sport.id)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${sports.includes(sport.id) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {sports.includes(sport.id) && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[#023047]">
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
                  className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[#023047] placeholder:text-gray-400 text-sm sm:text-base ${
                    sports.includes('other') && !sportOther.trim()
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#FB7D00]'
                  }`}
                />
              </div>
            )}
          </div>
        );

      case 'colors':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] text-center mb-6 sm:mb-8 md:mb-10">
              В какви цветове предпочиташ да са твоите спортни дрехи?
            </h2>
            <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {colorsOptions.map((color) => (
                <div
                  key={color.id}
                  onClick={() => toggleItem(colors, color.hex, setColors)}
                  title={color.label}
                  className={`aspect-square rounded-lg sm:rounded-xl cursor-pointer transition-all shadow-md hover:scale-105 ${
                    colors.includes(color.hex) ? 'ring-2 sm:ring-4 ring-[#FB7D00] ring-offset-1 sm:ring-offset-2' : ''
                  } ${color.hex === '#FFFFFF' ? 'border-2 border-gray-300' : ''} ${color.hex === '#FB7D00' && colors.includes(color.hex) ? 'ring-[#023047]' : ''}`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        );

      case 'flavors':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] text-center mb-6 sm:mb-8 md:mb-10">
              Кои вкусове предпочиташ?
            </h2>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {flavorsOptions.map((flavor) => (
                <div
                  key={flavor.id}
                  onClick={() => toggleItem(flavors, flavor.id, setFlavors)}
                  className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3 ${
                    flavors.includes(flavor.id)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${flavors.includes(flavor.id) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {flavors.includes(flavor.id) && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[#023047]">
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
                  className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[#023047] placeholder:text-gray-400 text-sm sm:text-base ${
                    flavors.includes('other') && !flavorOther.trim()
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#FB7D00]'
                  }`}
                />
              </div>
            )}
          </div>
        );

      case 'size':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] text-center mb-6 sm:mb-8 md:mb-10">
              Какъв размер спортни дрехи носиш?
            </h2>
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-md">
                <div className="text-base sm:text-lg font-semibold text-[#023047] mb-3 sm:mb-4">Горна част:</div>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {sizesOptions.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSizeUpper(size.id)}
                      className={`px-4 sm:px-5 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${
                        sizeUpper === size.id
                          ? 'bg-[#FB7D00] text-white'
                          : 'bg-gray-100 text-[#023047] hover:bg-gray-200'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-md">
                <div className="text-base sm:text-lg font-semibold text-[#023047] mb-3 sm:mb-4">Долна част:</div>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {sizesOptions.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSizeLower(size.id)}
                      className={`px-4 sm:px-5 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${
                        sizeLower === size.id
                          ? 'bg-[#FB7D00] text-white'
                          : 'bg-gray-100 text-[#023047] hover:bg-gray-200'
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] text-center mb-6 sm:mb-8 md:mb-10">
              Имаш ли хранителни ограничения?
            </h2>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {dietaryOptions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    // If clicking 'none', clear all other selections
                    if (item.id === 'none') {
                      setDietary(['none']);
                      setDietaryOther('');
                    } else {
                      // If clicking any other option, remove 'none' and toggle the item
                      const newDietary = dietary.filter(d => d !== 'none');
                      toggleItem(newDietary, item.id, setDietary);
                    }
                  }}
                  className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3 ${
                    dietary.includes(item.id)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${dietary.includes(item.id) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {dietary.includes(item.id) && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[#023047]">
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
                  className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[#023047] placeholder:text-gray-400 text-sm sm:text-base ${
                    dietary.includes('other') && !dietaryOther.trim()
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#FB7D00]'
                  }`}
                />
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] text-center mb-6 sm:mb-8 md:mb-10">
              Има ли нещо, което забравихме да попитаме, но искаш да добавиш?
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Напиши тук... (по желание)"
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-[#FB7D00] focus:outline-none min-h-[120px] sm:min-h-[150px] text-sm sm:text-base text-[#023047]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-4 sm:py-5 px-3 sm:px-5 pb-28 sm:pb-32">
      <div className="max-w-3xl mx-auto mt-12 sm:mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-10">
          <div className="text-base sm:text-lg md:text-xl font-semibold text-[#023047]">
            Стъпка 2 от 4 - Персонализация
          </div>
          <Link href="/" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 h-1.5 sm:h-2 rounded-full mb-6 sm:mb-10 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#FB7D00] to-[#ff9a3d] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="mb-6 sm:mb-10">{renderStep()}</div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-3 sm:py-4 px-3 sm:px-5">
        <div className="max-w-3xl mx-auto flex gap-2 sm:gap-4 justify-center">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-[#023047] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
            <button
              onClick={handleNext}
              disabled={!validateStep()}
              className="bg-[#FB7D00] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Напред
            </button>
        </div>
      </div>
    </div>
  );
}
