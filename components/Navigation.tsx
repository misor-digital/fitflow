'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { useDeliveryStore } from '@/store/deliveryStore';
import { createClient } from '@/lib/supabase/browser';
import { trackCTAClick } from '@/lib/analytics';
import PromoDiscountPrompt from './PromoDiscountPrompt';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [boxDropdownOpen, setBoxDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { promoCode } = useOrderStore();
  const { user, isLoading } = useAuthStore();
  const { revealedBoxAvailable, fetchRevealedBox } = useDeliveryStore();

  // ---- Fix P2: Cache discount in state, only fetch when promoCode changes ----
  const [discountPercent, setDiscountPercent] = useState(0);
  const [lastValidatedCode, setLastValidatedCode] = useState<string | null>(null);

  useEffect(() => {
    // Skip if same code was already validated
    if (promoCode === lastValidatedCode) return;
    if (!promoCode) {
      queueMicrotask(() => {
        setDiscountPercent(0);
        setLastValidatedCode(null);
      });
      return;
    }

    // Fix ST8: AbortController for cleanup
    const controller = new AbortController();

    async function fetchDiscount() {
      try {
        const response = await fetch(
          `/api/promo/validate?code=${encodeURIComponent(promoCode!)}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          setDiscountPercent(data.valid ? data.discountPercent : 0);
          setLastValidatedCode(promoCode);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error fetching discount:', err);
        setDiscountPercent(0);
      }
    }

    fetchDiscount();

    return () => controller.abort();
  }, [promoCode, lastValidatedCode]);

  // ---- Check if revealed box is available (shared store — deduped) ----
  useEffect(() => {
    fetchRevealedBox();
  }, [fetchRevealedBox]);

  // ---- Logout handler ----
  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/');
    router.refresh();
  }, [router]);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10 sm:h-12">
          {/* Desktop Menu - Left Side */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`font-semibold transition-colors ${
                isActive('/') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
              }`}
            >
              Начало
            </Link>
            {/* Кутии dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setBoxDropdownOpen(true)}
              onMouseLeave={() => setBoxDropdownOpen(false)}
            >
              <button
                className={`font-semibold transition-colors flex items-center gap-1 ${
                  pathname.startsWith('/box') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
                }`}
              >
                Кутии ▾
              </button>
              {boxDropdownOpen && (
                <div className="absolute left-0 top-full pt-1 w-48 z-50">
                  <div className="bg-white rounded-lg shadow-lg border py-2">
                  <Link
                    href="/box/mystery"
                    onClick={() => setBoxDropdownOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-[var(--color-brand-navy)] hover:bg-gray-50 hover:text-[var(--color-brand-orange)] transition-colors"
                  >
                    🎁 Мистериозна кутия
                  </Link>
                  {revealedBoxAvailable && (
                    <Link
                      href="/box/current"
                      onClick={() => setBoxDropdownOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-[var(--color-brand-navy)] hover:bg-gray-50 hover:text-[var(--color-brand-orange)] transition-colors"
                    >
                      👀 Разкрита кутия
                    </Link>
                  )}
                  <Link
                    href="/order/track"
                    onClick={() => setBoxDropdownOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-[var(--color-brand-navy)] hover:bg-gray-50 hover:text-[var(--color-brand-orange)] transition-colors"
                  >
                    📦 Проследи поръчка
                  </Link>
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/about"
              className={`font-semibold transition-colors ${
                isActive('/about') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
              }`}
            >
              За нас
            </Link>
            <Link
              href="/faqs"
              className={`font-semibold transition-colors ${
                isActive('/faqs') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
              }`}
            >
              Въпроси
            </Link>
          </div>

          {/* Mobile Menu Button - Left Side */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-[var(--color-brand-navy)] hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 sm:w-6 sm:h-6"
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
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl md:text-3xl font-extrabold text-[var(--color-brand-navy)] italic hover:text-[var(--color-brand-orange)] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>

          {/* Right Side: Auth + CTA */}
          <div className="flex items-center gap-3">
            {/* Auth UI */}
            {!isLoading && (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 text-sm text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] transition-colors"
                    >
                      <span className="hidden sm:inline font-medium">
                        {user.fullName || user.email}
                      </span>
                      {/* User avatar or initials circle */}
                      <div className="w-8 h-8 rounded-full bg-[var(--color-brand-navy)] text-white flex items-center justify-center text-xs font-bold">
                        {(user.fullName?.[0] ?? user.email[0]).toUpperCase()}
                      </div>
                    </button>

                    {/* Dropdown menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                        <Link
                          href="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm hover:bg-gray-50"
                        >
                          Моят профил
                        </Link>
                        {user.userType === 'staff' && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2 text-sm hover:bg-gray-50"
                          >
                            Админ панел
                          </Link>
                        )}
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Изход
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link
                      href="/login"
                      className="text-sm font-medium text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] transition-colors"
                    >
                      Вход
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* CTA Button with Promo Prompt */}
            <div className="relative">
            <Link
              href="/order"
              onClick={() => trackCTAClick({ cta_text: 'Запиши поръчка', cta_location: 'navigation', destination: '/order' })}
              className="bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-orange)] px-2.5 sm:px-2.5 py-2 sm:py-2 rounded-lg transition-colors block"
              aria-label="Запиши поръчка"
            >
              <svg
                className="w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white"
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
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
                }`}
              >
                Начало
              </Link>
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/about') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
                }`}
              >
                За нас
              </Link>
              <Link
                href="/faqs"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/faqs') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
                }`}
              >
                Въпроси
              </Link>
              <Link
                href="/box/mystery"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/box/mystery') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
                }`}
              >
                🎁 Мистериозна кутия
              </Link>
              {revealedBoxAvailable && (
                <Link
                  href="/box/current"
                  onClick={() => setIsOpen(false)}
                  className="text-sm sm:text-base font-semibold text-[var(--color-brand-orange)] flex items-center gap-1.5"
                >
                  👀 Разкрита кутия
                </Link>
              )}
              <Link
                href="/order/track"
                onClick={() => setIsOpen(false)}
                className={`text-sm sm:text-base font-semibold transition-colors ${
                  isActive('/order/track') ? 'text-[var(--color-brand-orange)]' : 'text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]'
                }`}
              >
                📦 Проследи поръчка
              </Link>

              {/* Mobile auth links */}
              {!isLoading && !user && (
                <Link href="/login" onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold text-[var(--color-brand-navy)]">
                  Вход
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
