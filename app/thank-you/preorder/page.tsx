'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';

export default function ThankYou() {
  const router = useRouter();
  const store = useFormStore();

  const handleGoHome = () => {
    store.reset();
    router.push('/');
  };

  // Redirect to home if accessed directly without completing the form
  useEffect(() => {
    if (!store.email || !store.fullName) {
      router.push('/');
    }
  }, [store.email, store.fullName, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white flex items-center justify-center px-5">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-[scaleIn_0.5s_ease-out]">
              <svg 
                className="w-12 h-12 text-green-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* Logo */}
          <div className="text-3xl font-extrabold text-[#023047] italic mb-6">
            FitFlow
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#023047] mb-4">
            Благодарим ти!
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-lg mb-4 leading-relaxed">
            Твоята предварителна поръчка беше изпратена успешно.
          </p>

          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            Ще получиш потвърждение на имейла си и скоро ще се свържем с теб с повече информация.
          </p>

          {/* Divider */}
          <div className="w-16 h-1 bg-[#FB7D00] mx-auto mb-8 rounded"></div>

          {/* Additional Info */}
          <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 rounded-2xl p-6 mb-8">
            <p className="text-[#023047] font-medium">
              Имаш въпроси? Свържи се с нас на{' '}
              <a 
                href="mailto:info@fitflow.bg" 
                className="text-[#FB7D00] hover:underline font-semibold"
              >
                info@fitflow.bg
              </a>
            </p>
          </div>

          {/* Button */}
          <button
            onClick={handleGoHome}
            className="w-full bg-[#FB7D00] text-white py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Към началото
          </button>
        </div>
      </div>
    </div>
  );
}
