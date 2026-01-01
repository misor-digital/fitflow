'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import { trackFunnelStep, trackFormInteraction } from '@/lib/analytics';
import Link from 'next/link';
import { isValidEmail, isValidPhone, getEmailError, getPhoneError } from '@/lib/preorder';

export default function Step3() {
  const router = useRouter();
  const store = useFormStore();
  const hasTrackedStep = useRef(false);
  
  // Track funnel step on mount
  useEffect(() => {
    if (!hasTrackedStep.current) {
      trackFunnelStep('contact_info', 3);
      hasTrackedStep.current = true;
    }
  }, []);
  
  const [fullName, setFullName] = useState(store.fullName);
  const [email, setEmail] = useState(store.email);
  const [phone, setPhone] = useState(store.phone);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const handleBack = () => {
    router.push('/step-2?returnToSummary=true');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Only show validation error if user has already tried to submit
    if (hasAttemptedSubmit) {
      const error = getEmailError(value);
      setEmailError(error || '');
      if (error) {
        trackFormInteraction({
          form_name: 'contact_info',
          field_name: 'email',
          interaction_type: 'error',
          error_message: error,
        });
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Use shared validation
    if (isValidPhone(value)) {
      setPhone(value);
      setPhoneError('');
    } else {
      const error = getPhoneError(value);
      setPhoneError(error || '');
      if (error) {
        trackFormInteraction({
          form_name: 'contact_info',
          field_name: 'phone',
          interaction_type: 'error',
          error_message: error,
        });
      }
    }
  };

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    
    // Validate email using shared validation
    if (email && !isValidEmail(email)) {
      const error = getEmailError(email) || '';
      setEmailError(error);
      trackFormInteraction({
        form_name: 'contact_info',
        field_name: 'email',
        interaction_type: 'error',
        error_message: error,
      });
      return;
    }
    
    if (fullName && email) {
      store.setContactInfo(fullName, email, phone);
      router.push('/step-4');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-4 sm:py-5 px-3 sm:px-5 pb-28 sm:pb-32">
      <div className="max-w-2xl mx-auto mt-12 sm:mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 sm:mb-16">
          <div className="text-base sm:text-lg md:text-xl font-semibold text-[#023047]">Стъпка 3 от 4 - Лични данни</div>
          <Link href="/" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>
        </div>

        {/* Thank You Message */}
        <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg mb-6 sm:mb-8 md:mb-10">
          <p className="text-xl sm:text-2xl font-bold text-[#023047] mb-2 sm:mb-4 text-center">
            Почти e готово!
          </p>
          <p className="text-sm sm:text-base md:text-lg text-[#023047] leading-relaxed text-center">
            Попълни личните си данни, за да завършиш предварителната поръчка. Ще получиш потвърждение на имейла си.
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-white p-5 sm:p-7 md:p-10 rounded-xl sm:rounded-2xl shadow-lg mb-6 sm:mb-8 md:mb-10">
          <h3 className="text-xl sm:text-2xl font-bold text-[#023047] mb-4 sm:mb-6 text-center">Лични данни</h3>
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm sm:text-base font-semibold text-[#023047] mb-1.5 sm:mb-2">
                Име и фамилия<span className="text-[#FB7D00] ml-1">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Въведи твоето име и фамилия"
                required
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-[#FB7D00] focus:outline-none transition-colors hover:border-[#FB7D00] text-sm sm:text-base text-[#023047]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-[#023047] mb-1.5 sm:mb-2">
                Email<span className="text-[#FB7D00] ml-1">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="name@email.com"
                required
                className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none transition-colors text-sm sm:text-base text-[#023047] ${
                  emailError 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:border-[#FB7D00] hover:border-[#FB7D00]'
                }`}
              />
              {emailError && (
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm sm:text-base font-semibold text-[#023047] mb-1.5 sm:mb-2">
                Телефонен номер
                <span className="text-gray-500 font-normal text-xs sm:text-sm ml-1 sm:ml-2">(по желание)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+359..."
                className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none transition-colors text-sm sm:text-base text-[#023047] ${
                  phoneError 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:border-[#FB7D00] hover:border-[#FB7D00]'
                }`}
              />
              {phoneError && (
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{phoneError}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-3 sm:py-4 px-3 sm:px-5">
        <div className="max-w-2xl mx-auto flex gap-2 sm:gap-4 justify-center">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-[#023047] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
          <button
            onClick={handleContinue}
            disabled={!fullName || !email}
            className="bg-[#FB7D00] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          >
            Напред
          </button>
        </div>
      </div>
    </div>
  );
}
