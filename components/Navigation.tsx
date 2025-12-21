'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
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
            className="md:hidden p-2 rounded-lg text-[#023047] hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
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
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>

          {/* CTA Button - Right Side */}
          <Link
            href="/step-1"
            className="bg-[#023047] hover:bg-[#FB7D00] px-4 py-2 rounded-lg"
            aria-label="Запиши предварителна поръчка"
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
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
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className={`font-semibold transition-colors ${
                  isActive('/') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
                }`}
              >
                Начало
              </Link>
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className={`font-semibold transition-colors ${
                  isActive('/about') ? 'text-[#FB7D00]' : 'text-[#023047] hover:text-[#FB7D00]'
                }`}
              >
                За нас
              </Link>
              <Link
                href="/faqs"
                onClick={() => setIsOpen(false)}
                className={`font-semibold transition-colors ${
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
