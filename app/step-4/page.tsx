'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';

const BOX_TYPES: Record<string, { name: string; price: string }> = {
  'monthly-standard': { name: 'Месечна - Стандартна', price: '48.70 лв / 24.90 €' },
  'monthly-premium-monthly': { name: 'Месечна - Премиум (всеки месец)', price: '68.26 лв / 34.90 €' },
  'monthly-premium-seasonal': { name: 'Месечна - Премиум (всеки 3 месеца)', price: '68.26 лв / 34.90 €' },
  'onetime-standard': { name: 'Еднократна - Стандартна', price: '58.48 лв / 29.90 €' },
  'onetime-premium': { name: 'Еднократна - Премиум', price: '78.04 лв / 39.90 €' },
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

export default function Step4() {
  const router = useRouter();
  const store = useFormStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    router.push('/step-3');
  };

  const handleFinalSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const formData = {
        fullName: store.fullName,
        email: store.email,
        phone: store.phone,
        boxType: store.boxType,
        wantsPersonalization: store.wantsPersonalization,
        preferences: store.wantsPersonalization ? {
          sports: store.sports,
          sportOther: store.sportOther,
          colors: store.colors,
          contents: store.contents,
          dietary: store.dietary,
          dietaryOther: store.dietaryOther,
          additionalNotes: store.additionalNotes,
        } : null,
        sizes: {
          upper: store.sizeUpper,
          lower: store.sizeLower,
        },
      };

      const response = await fetch('/api/preorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      alert('Благодарим ти! Твоите данни са изпратени успешно. Скоро ще се свържем с теб! 💪');
      store.reset();
      router.push('/');
    } catch (err) {
      setError('Възникна грешка. Моля, опитайте отново.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 pb-32">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <div className="text-xl font-semibold text-[#023047]">Стъпка 4 от 4 - Финализиране</div>
          <div className="text-3xl font-extrabold text-[#023047] italic">FitFlow</div>
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-[#023047] text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
          Преглед на поръчката
        </h2>

        {/* Summary Cards */}
        <div className="space-y-6 mb-10">
          {/* Box Type */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Избрана кутия</h3>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-semibold text-[#023047]">
                  {store.boxType && BOX_TYPES[store.boxType]?.name || 'Не е избрана'}
                </div>
              </div>
              <div className="text-2xl font-bold text-[#FB7D00]">
                {store.boxType && BOX_TYPES[store.boxType]?.price || '-'}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Лични данни</h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-[#023047]">Име:</span>
                <span className="ml-2 text-gray-600">{store.fullName}</span>
              </div>
              <div>
                <span className="font-semibold text-[#023047]">Email:</span>
                <span className="ml-2 text-gray-600">{store.email}</span>
              </div>
              {store.phone && (
                <div>
                  <span className="font-semibold text-[#023047]">Телефон:</span>
                  <span className="ml-2 text-gray-600">{store.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          {store.wantsPersonalization ? (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Предпочитания</h3>
              <div className="space-y-4">
                {store.sports.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Спорт:</div>
                    <div className="text-gray-600">
                      {store.sports.map(s => SPORT_LABELS[s] || s).join(', ')}
                      {store.sportOther && ` (${store.sportOther})`}
                    </div>
                  </div>
                )}
                {store.colors.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-2">Цветове:</div>
                    <div className="flex gap-2 flex-wrap">
                      {store.colors.map(c => (
                        <div key={c} className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
                {store.contents.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Продукти:</div>
                    <div className="text-gray-600">
                      {store.contents.map(c => CONTENT_LABELS[c] || c).join(', ')}
                    </div>
                  </div>
                )}
                {store.flavors.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Вкусове:</div>
                    <div className="text-gray-600">
                      {store.flavors.map(f => FLAVOR_LABELS[f] || f).join(', ')}
                    </div>
                  </div>
                )}
                {store.dietary.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Хранителни ограничения:</div>
                    <div className="text-gray-600">
                      {store.dietary.map(d => DIETARY_LABELS[d] || d).join(', ')}
                      {store.dietaryOther && ` (${store.dietaryOther})`}
                    </div>
                  </div>
                )}
                {store.additionalNotes && store.additionalNotes.trim() !== '' && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Допълнителни бележки:</div>
                    <div className="text-gray-600">{store.additionalNotes}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Персонализация</h3>
              <p className="text-gray-600">Оставям избора на вас</p>
            </div>
          )}

          {/* Sizes */}
          {store.sizeLower && store.sizeUpper && (<div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Размери</h3>
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-[#023047]">Горна част:</span>
                <span className="ml-2 text-gray-600">{store.sizeUpper}</span>
              </div>
              <div>
                <span className="font-semibold text-[#023047]">Долна част:</span>
                <span className="ml-2 text-gray-600">{store.sizeLower}</span>
              </div>
            </div>
          </div>)}
          
        </div>

        {/* Confirmation Message */}
        <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-8 rounded-2xl shadow-lg mb-10">
          <p className="text-lg text-[#023047] leading-relaxed text-center font-semibold">
            Моля, прегледай внимателно информацията по-горе. След натискане на &quot;Потвърди и изпрати&quot;, твоята предварителна поръчка ще бъде записана и ще получиш потвърждение на имейла си.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-5">
        <div className="max-w-3xl mx-auto flex gap-4 justify-center">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-[#023047] px-10 py-4 rounded-full text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="bg-[#FB7D00] text-white px-12 py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Изпращане...' : 'Потвърди и изпрати'}
          </button>
        </div>
      </div>
    </div>
  );
}
