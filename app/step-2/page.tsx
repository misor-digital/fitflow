'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';

const COLORS = [
  '#000000', '#FFFFFF', '#8A8A8A', '#0A1A33', '#7EC8E3',
  '#F4C2C2', '#8d010d', '#B497D6', '#556B2F', '#FB7D00'
];

const COLOR_NAMES: Record<string, string> = {
  '#000000': 'Черно',
  '#FFFFFF': 'Бяло',
  '#8A8A8A': 'Сиво',
  '#0A1A33': 'Тъмно синьо',
  '#7EC8E3': 'Светло синьо',
  '#F4C2C2': 'Розово',
  '#8d010d': 'Бордо',
  '#B497D6': 'Лилаво',
  '#556B2F': 'Маслинено зелено',
  '#FB7D00': 'Оранжево'
};

const SPORT_LABELS: Record<string, string> = {
  'fitness': 'Фитнес',
  'dance': 'Танци',
  'yoga': 'Йога/пилатес',
  'running': 'Бягане',
  'swimming': 'Плуване',
  'team': 'Отборен спорт',
  'other': 'Друго'
};

const CONTENT_LABELS: Record<string, string> = {
  'clothes': 'Спортни дрехи',
  'accessories': 'Спортни аксесоари',
  'protein': 'Протеинови продукти',
  'supplements': 'Хранителни добавки',
  'challenges': 'Тренировъчни предизвикателства и оферти'
};

const FLAVOR_LABELS: Record<string, string> = {
  'chocolate': 'Шоколад',
  'strawberry': 'Ягода',
  'vanilla': 'Ванилия',
  'salted-caramel': 'Солен карамел',
  'biscuit': 'Бисквита',
  'other': 'Друго'
};

const DIETARY_LABELS: Record<string, string> = {
  'none': 'Не',
  'lactose': 'Без лактоза',
  'gluten': 'Без глутен',
  'vegan': 'Веган',
  'other': 'Друго'
};

export default function Step2() {
  const router = useRouter();
  const store = useFormStore();
  
  // Determine if box is premium
  const isPremium = store.boxType?.includes('premium') || false;
  
  // Local state for each step
  const [wantsPersonalization, setWantsPersonalization] = useState<boolean | null>(store.wantsPersonalization);
  const [sports, setSports] = useState<string[]>(store.sports);
  const [sportOther, setSportOther] = useState(store.sportOther);
  const [colors, setColors] = useState<string[]>(store.colors);
  const [contents, setContents] = useState<string[]>(store.contents);
  const [flavors, setFlavors] = useState<string[]>(store.flavors);
  const [flavorOther, setFlavorOther] = useState(store.flavorOther);
  const [sizeUpper, setSizeUpper] = useState(store.sizeUpper);
  const [sizeLower, setSizeLower] = useState(store.sizeLower);
  const [dietary, setDietary] = useState<string[]>(store.dietary);
  const [dietaryOther, setDietaryOther] = useState(store.dietaryOther);
  const [notes, setNotes] = useState(store.additionalNotes);

  // Determine active steps based on box type and personalization
  const getActiveSteps = (personalization: boolean | null, premium: boolean) => {
    if (personalization === null) {
      return ['personalization'];
    }
    
    if (premium) {
      if (personalization) {
        return ['personalization', 'sport', 'colors', 'contents', 'flavors', 'size', 'dietary', 'notes'];
        // return ['personalization', 'sport', 'colors', 'contents', 'flavors', 'size', 'dietary', 'notes', 'summary'];
      } else {
        return ['personalization', 'size'];
        // return ['personalization', 'size', 'summary'];
      }
    } else {
      // Standard box
      if (personalization) {
        return ['personalization', 'sport', 'flavors', 'dietary', 'notes'];
        // return ['personalization', 'sport', 'flavors', 'dietary', 'notes', 'summary'];
      } else {
        return ['personalization'];
        // return ['personalization', 'summary'];
      }
    }
  };

  // Compute active steps directly based on dependencies
  const activeSteps = getActiveSteps(wantsPersonalization, isPremium);
  const [currentStep, setCurrentStep] = useState(0);

  // Ensure current step is within valid range
  const validCurrentStep = Math.min(currentStep, Math.max(0, activeSteps.length - 1));

  const progress = wantsPersonalization !== null
    ? ((currentStep + 1) / activeSteps.length) * 100
    : 0;

  const toggleItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const validateStep = () => {
    const step = activeSteps[validCurrentStep];
    switch (step) {
      case 'personalization':
        return wantsPersonalization !== null;
      case 'sport':
        if (sports.includes('other')) {
          return sports.length > 0 && sportOther.trim().length > 0;
        }
        return sports.length > 0;
      case 'colors':
        return colors.length > 0;
      case 'contents':
        return contents.length > 0;
      case 'flavors':
        if (flavors.includes('other')) {
          return flavors.length > 0 && flavorOther.trim().length > 0;
        }
        return flavors.length > 0;
      case 'size':
        return sizeUpper && sizeLower;
      case 'dietary':
        if (dietary.includes('other')) {
          return dietary.length > 0 && dietaryOther.trim().length > 0;
        }
        return dietary.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    
    // Special handling for personalization step - move to next step
    if (activeSteps[currentStep] === 'personalization' && wantsPersonalization !== null) {
      // Active steps will be recalculated automatically based on wantsPersonalization
      // Move to next step in the array
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
    // Save all data to store
    store.setPersonalization(wantsPersonalization!);
    store.setSports(sports);
    store.setSportOther(sportOther);
    store.setColors(colors);
    store.setContents(contents);
    store.setFlavors(flavors);
    store.setFlavorOther(flavorOther);
    store.setSizes(sizeUpper, sizeLower);
    store.setDietary(dietary);
    store.setDietaryOther(dietaryOther);
    store.setAdditionalNotes(notes);
    
    router.push('/step-3');
  };

  const renderStep = () => {
    const step = activeSteps[validCurrentStep];

    switch (step) {
      case 'personalization':
        return (
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#023047] text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
              Персонализация
            </h2>
            <div className="space-y-5">
              {[
                { value: true, title: 'Да, искам персонализация', desc: 'Персонализацията включва няколко въпроса, свързани с твоите предпочитания и нужди' },
                { value: false, title: 'Не, оставям избора на вас', desc: null }
              ].map((option) => (
                <div
                  key={String(option.value)}
                  onClick={() => setWantsPersonalization(option.value)}
                  className={`bg-white rounded-2xl p-6 shadow-lg cursor-pointer transition-all border-3 ${
                    wantsPersonalization === option.value
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-3 flex-shrink-0 ${wantsPersonalization === option.value ? 'border-[#FB7D00]' : 'border-gray-300'}`}>
                      {wantsPersonalization === option.value && <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-[#023047] mb-1">{option.title}</div>
                      {option.desc && <div className="text-sm text-gray-600">{option.desc}</div>}
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              Какъв спорт практикуваш?
            </h2>
            <div className="space-y-4">
              {['fitness', 'dance', 'yoga', 'running', 'swimming', 'team', 'other'].map((sport) => (
                <div
                  key={sport}
                  onClick={() => toggleItem(sports, sport, setSports)}
                  className={`bg-white rounded-xl p-5 shadow-md cursor-pointer transition-all border-3 ${
                    sports.includes(sport)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${sports.includes(sport) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {sports.includes(sport) && <div className="text-white text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-lg font-semibold text-[#023047]">
                      {SPORT_LABELS[sport]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {sports.includes('other') && (
              <div className="mt-4">
                <input
                  type="text"
                  value={sportOther}
                  onChange={(e) => setSportOther(e.target.value)}
                  placeholder="Кой спорт?"
                  className={`w-full p-4 border-2 rounded-xl focus:outline-none text-[#023047] placeholder:text-gray-400 ${
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              В какви цветове предпочиташ да са твоите спортни дрехи?
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => toggleItem(colors, color, setColors)}
                  title={COLOR_NAMES[color]}
                  className={`aspect-square rounded-xl cursor-pointer transition-all shadow-md hover:scale-105 ${
                    colors.includes(color) ? 'ring-4 ring-[#FB7D00] ring-offset-2' : ''
                  } ${color === '#FFFFFF' ? 'border-2 border-gray-300' : ''} ${color === '#FB7D00' && colors.includes(color) ? 'ring-[#023047]' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        );

      case 'contents':
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              Какво държиш да има в твоята кутия?
            </h2>
            <div className="space-y-4">
              {['clothes', 'accessories', 'protein', 'supplements', 'challenges'].map((item) => (
                <div
                  key={item}
                  onClick={() => toggleItem(contents, item, setContents)}
                  className={`bg-white rounded-xl p-5 shadow-md cursor-pointer transition-all border-3 ${
                    contents.includes(item)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${contents.includes(item) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {contents.includes(item) && <div className="text-white text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-lg font-semibold text-[#023047]">
                      {CONTENT_LABELS[item]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'flavors':
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              Кои вкусове предпочиташ?
            </h2>
            <div className="space-y-4">
              {['chocolate', 'strawberry', 'vanilla', 'salted-caramel', 'biscuit', 'other'].map((flavor) => (
                <div
                  key={flavor}
                  onClick={() => toggleItem(flavors, flavor, setFlavors)}
                  className={`bg-white rounded-xl p-5 shadow-md cursor-pointer transition-all border-3 ${
                    flavors.includes(flavor)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${flavors.includes(flavor) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {flavors.includes(flavor) && <div className="text-white text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-lg font-semibold text-[#023047]">
                      {FLAVOR_LABELS[flavor]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {flavors.includes('other') && (
              <div className="mt-4">
                <input
                  type="text"
                  value={flavorOther}
                  onChange={(e) => setFlavorOther(e.target.value)}
                  placeholder="Кой вкус?"
                  className={`w-full p-4 border-2 rounded-xl focus:outline-none text-[#023047] placeholder:text-gray-400 ${
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              Какъв размер спортни дрехи носиш?
            </h2>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-lg font-semibold text-[#023047] mb-4">Горна част:</div>
                <div className="flex gap-3 flex-wrap">
                  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSizeUpper(size)}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        sizeUpper === size
                          ? 'bg-[#FB7D00] text-white'
                          : 'bg-gray-100 text-[#023047] hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-lg font-semibold text-[#023047] mb-4">Долна част:</div>
                <div className="flex gap-3 flex-wrap">
                  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSizeLower(size)}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        sizeLower === size
                          ? 'bg-[#FB7D00] text-white'
                          : 'bg-gray-100 text-[#023047] hover:bg-gray-200'
                      }`}
                    >
                      {size}
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              Имаш ли хранителни ограничения?
            </h2>
            <div className="space-y-4">
              {['none', 'lactose', 'gluten', 'vegan', 'other'].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    // If clicking 'none', clear all other selections
                    if (item === 'none') {
                      setDietary(['none']);
                      setDietaryOther('');
                    } else {
                      // If clicking any other option, remove 'none' and toggle the item
                      const newDietary = dietary.filter(d => d !== 'none');
                      toggleItem(newDietary, item, setDietary);
                    }
                  }}
                  className={`bg-white rounded-xl p-5 shadow-md cursor-pointer transition-all border-3 ${
                    dietary.includes(item)
                      ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                      : 'border-transparent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${dietary.includes(item) ? 'border-[#FB7D00] bg-[#FB7D00]' : 'border-gray-300'}`}>
                      {dietary.includes(item) && <div className="text-white text-sm font-bold">✓</div>}
                    </div>
                    <div className="text-lg font-semibold text-[#023047]">
                      {DIETARY_LABELS[item]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {dietary.includes('other') && (
              <div className="mt-4">
                <input
                  type="text"
                  value={dietaryOther}
                  onChange={(e) => setDietaryOther(e.target.value)}
                  placeholder="Какви ограничения?"
                  className={`w-full p-4 border-2 rounded-xl focus:outline-none text-[#023047] placeholder:text-gray-400 ${
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] text-center mb-10">
              Има ли нещо, което забравихме да попитаме, но искаш да добавиш?
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Напиши тук... (по желание)"
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-[#FB7D00] focus:outline-none min-h-[150px] text-[#023047]"
            />
          </div>
        );

      case 'summary':
        return (
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#023047] text-center mb-8 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
              Преглед и потвърждение
            </h2>
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6 space-y-4">
              <div className="border-b pb-4">
                <div className="font-semibold text-[#023047] mb-2">Персонализация:</div>
                <div className="text-gray-600">
                  {wantsPersonalization ? 'Да, искам персонализация' : 'Не, оставям избора на вас'}
                </div>
              </div>
              {wantsPersonalization && (
                <>
                  <div className="border-b pb-4">
                    <div className="font-semibold text-[#023047] mb-2">Спорт:</div>
                    <div className="text-gray-600">
                      {sports.map(s => SPORT_LABELS[s] || s).join(', ')}
                      {sportOther && ` (${sportOther})`}
                    </div>
                  </div>
                  {isPremium && colors.length > 0 && (
                    <div className="border-b pb-4">
                      <div className="font-semibold text-[#023047] mb-2">Цветове:</div>
                      <div className="flex gap-2 flex-wrap">
                        {colors.map(c => (
                          <div key={c} className="w-6 h-6 rounded border" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {isPremium && contents.length > 0 && (
                    <div className="border-b pb-4">
                      <div className="font-semibold text-[#023047] mb-2">Продукти:</div>
                      <div className="text-gray-600">
                        {contents.map(c => CONTENT_LABELS[c] || c).join(', ')}
                      </div>
                    </div>
                  )}
                  <div className="border-b pb-4">
                    <div className="font-semibold text-[#023047] mb-2">Вкусове:</div>
                    <div className="text-gray-600">
                      {flavors.map(f => FLAVOR_LABELS[f] || f).join(', ')}
                      {flavorOther && ` (${flavorOther})`}
                    </div>
                  </div>
                </>
              )}
              {isPremium && (
                <div className="border-b pb-4">
                  <div className="font-semibold text-[#023047] mb-2">Размер:</div>
                  <div className="text-gray-600">Горна част: {sizeUpper}, Долна част: {sizeLower}</div>
                </div>
              )}
              {wantsPersonalization && dietary.length > 0 && (
                <div className="border-b pb-4">
                  <div className="font-semibold text-[#023047] mb-2">Хранителни ограничения:</div>
                  <div className="text-gray-600">
                    {dietary.map(d => DIETARY_LABELS[d] || d).join(', ')}
                    {dietaryOther && ` (${dietaryOther})`}
                  </div>
                </div>
              )}
              {notes && notes.trim() && (
                <div className="pb-4">
                  <div className="font-semibold text-[#023047] mb-2">Допълнителни бележки:</div>
                  <div className="text-gray-600">{notes}</div>
                </div>
              )}
            </div>
            <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-6 rounded-xl text-center">
              <p className="text-[#023047] leading-relaxed">
                Благодарим ти! Използваме тази информация, за да персонализираме твоята спортна кутия. Натисни &apos;Изпрати&apos;, за да запазим предпочитанията ти.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 pb-32">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="text-xl font-semibold text-[#023047]">
            Стъпка 2 от 4 - Персонализация
          </div>
          <div className="text-3xl font-extrabold text-[#023047] italic">FitFlow</div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 h-2 rounded-full mb-10 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#FB7D00] to-[#ff9a3d] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="mb-10">{renderStep()}</div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-5">
        <div className="max-w-3xl mx-auto flex gap-4 justify-center">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-[#023047] px-10 py-4 rounded-full font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
            <button
              onClick={handleNext}
              disabled={!validateStep()}
              className="bg-[#FB7D00] text-white px-12 py-4 rounded-full font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Напред
            </button>
        </div>
      </div>
    </div>
  );
}
