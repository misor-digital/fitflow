'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const faqs = [
  {
    question: 'Колко често ще получавам кутията си?',
    answer: 'Можеш да избереш между еднократна покупка или абонаментен план - всеки месец или всеки 3 месеца.'
  },
  {
    question: 'Кога ще получа кутията си?',
    answer: 'При еднократна покупка ще получиш кутия до 5 работни дни от потвърждаване на поръчката. Ако избереш абонаментен план, ще получаваш кутията си в началото на месеца, между 1-во и 5-то число.'
  },
  {
    question: 'Мога ли да купя кутия без абонамент?',
    answer: 'Да, може да избереш еднократна покупка на кутия.'
  },
  {
    question: 'Мога ли да анулирам абонамента си?',
    answer: <>Да, може да анулираш абонамента си, като се свържеш с нас на <a href="mailto:info@fitflow.bg" className="text-[#FB7D00] hover:underline">info@fitflow.bg</a> до 5 дни преди пускането на абонаментните кутии.</>
  }
];

export default function FAQsPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white pt-8 sm:pt-10 pb-12 sm:pb-16 px-3 sm:px-5">
        <div className="max-w-4xl mx-auto mt-12 sm:mt-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#023047] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
            Често задавани въпроси
          </h1>

          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden transition-all ${
                  activeIndex === index ? 'shadow-xl' : ''
                }`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left p-4 sm:p-5 md:p-7 pr-12 sm:pr-14 md:pr-16 relative hover:bg-[#FB7D00]/5 transition-colors"
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#023047] pr-6 sm:pr-8">
                    {faq.question}
                  </h3>
                  <span
                    className={`absolute right-4 sm:right-5 md:right-6 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl text-[#FB7D00] font-light transition-transform ${
                      activeIndex === index ? 'rotate-180' : ''
                    }`}
                  >
                    {activeIndex === index ? '−' : '+'}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    activeIndex === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-4 sm:px-5 md:px-7 pb-4 sm:pb-5 md:pb-7">
                    <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
