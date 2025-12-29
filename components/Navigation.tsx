'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import PromoDiscountPrompt from './PromoDiscountPrompt';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { promoCode } = useFormStore();
  
  // Fetch discount percent from API
  const [discountPercent, setDiscountPercent] = useState(0);
  
  useEffect(() => {
    async function fetchDiscount() {
      if (!promoCode) {
        setDiscountPercent(0);
        return;
      }
      
      try {
        const response = await fetch(`/api/promo/validate?code=${encodeURIComponent(promoCode)}`);
        if (response.ok) {
          const data = await response.json();
          setDiscountPercent(data.valid ? data.discountPercent : 0);
        }
      } catch (err) {
        console.error('Error fetching discount:', err);
        setDiscountPercent(0);
      }
    }
    
    fetchDiscount();
  }, [promoCode]);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-10 sm:top-12 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10 sm:h-12">
          {/* Desktop Menu - Left Side */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`font-semibold transition-colors ${
                isActive('/') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
              }`}
            >
              Начало
            </Link>
            <Link
              href="/about"
              className={`font-semibold transition-colors ${
                isActive('/about') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
              }`}
            >
              За нас
            </Link>
            <Link
              href="/faqs"
              className={`font-semibold transition-colors ${
                isActive('/faqs') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
              }`}
            >
              Въпроси
            </Link>
          </div>

          {/* Mobile Menu Button - Left Side */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-[#023047] hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo - Center */}
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>

          {/* CTA Button with Promo Prompt - Right Side */}
          <div className="relative">
            <Link
              href="/step-1"
              className="bg-[#023047] hover:bg-[#FB7D00] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors block"
              aria-label="Запиши предварителна поръчка"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>
            
            {/* Promo Discount Prompt - Below CTA with arrow pointing up */}
            <PromoDiscountPrompt discountPercent={discountPercent} />
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
                }`}
              >
                Начало
              </Link>
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/about') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
                }`}
              >
                За нас
              </Link>
              <Link
                href="/faqs"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/faqs') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
                }`}
              >
                Въпроси
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
