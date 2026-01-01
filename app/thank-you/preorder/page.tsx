'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import { trackLead } from '@/lib/analytics';

export default function ThankYou() {
  const router = useRouter();
  const store = useFormStore();
  const hasTrackedLead = useRef(false);

  const handleGoHome = () => {
    store.reset();
    router.push('/');
  };

  // Track Lead event on successful form submission (primary conversion)
  useEffect(() => {
    // Only track if user completed the form (has email and name)
    if (store.email && store.fullName && !hasTrackedLead.current) {
      trackLead();
      hasTrackedLead.current = true;
    }
  }, [store.email, store.fullName]);

  // Redirect to home if accessed directly without completing the form
  useEffect(() => {
    if (!store.email || !store.fullName) {
      router.push('/');
    }
  }, [store.email, store.fullName, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white flex items-center justify-center p-3 sm:p-5">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-5 sm:mb-6 md:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-green-100 rounded-full flex items-center justify-center animate-[scaleIn_0.5s_ease-out]">
              <svg 
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-500" 
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
          <div className="text-2xl sm:text-3xl font-extrabold text-[#023047] italic mb-4 sm:mb-5 md:mb-6">
            FitFlow
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#023047] mb-3 sm:mb-4">
            Благодарим ти!
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-base sm:text-lg mb-3 sm:mb-4 leading-relaxed">
            Твоята предварителна поръчка беше изпратена успешно.
          </p>

          <p className="text-gray-600 text-base sm:text-lg mb-5 sm:mb-6 md:mb-8 leading-relaxed">
            Ще получиш потвърждение на имейла си и скоро ще се свържем с теб с повече информация.
          </p>

          {/* Divider */}
          <div className="w-12 sm:w-16 h-1 bg-[#FB7D00] mx-auto mb-5 sm:mb-6 md:mb-8 rounded"></div>

          {/* Additional Info */}
          <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 mb-5 sm:mb-6 md:mb-8">
            <p className="text-sm sm:text-base text-[#023047] font-medium">
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
            className="w-full bg-[#FB7D00] text-white py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Към началото
          </button>
        </div>
      </div>
    </div>
  );
}
