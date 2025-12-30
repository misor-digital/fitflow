import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#023047] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xl sm:text-2xl font-extrabold italic text-[#FB7D00] mb-3 sm:mb-4">FitFlow</h3>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
              Спортна абонаментна кутия за активни дами. Мотивация, облекло и добавки на едно място.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FB7D00]">Бързи връзки</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Начало
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  За нас
                </Link>
              </li>
              <li>
                <Link href="/faqs" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Въпроси
                </Link>
              </li>
              <li>
                <Link href="/step-1" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Предварителна поръчка
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="hidden md:block">
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FB7D00]">Поддръжка</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link href="/faqs" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Често задавани въпроси
                </Link>
              </li>
              <li>
                <a href="mailto:info@fitflow.bg" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Свържи се с нас
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Условия за ползване
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Политика за поверителност
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  Политика за бисквитки
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FB7D00]">Контакти</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start gap-1.5 sm:gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#FB7D00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:info@fitflow.bg" className="text-gray-300 hover:text-[#FB7D00] transition-colors text-xs sm:text-sm">
                  info@fitflow.bg
                </a>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#FB7D00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-300 text-xs sm:text-sm"><a href="tel:+359879447845">+359 87 944 7845</a></span>
              </li>
            </ul>

            {/* Social Media */}
            <div className="mt-4 sm:mt-6">
              <h5 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-300">Последвай ни</h5>
              <div className="flex gap-2 sm:gap-3">
                <a href="https://www.facebook.com/people/FitFlow/61584666749010/" target="_blank" className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FB7D00] transition-colors" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/fitflowbg" target="_blank" className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FB7D00] transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://www.tiktok.com/@fitflow.bg" target="_blank" className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FB7D00] transition-colors" aria-label="TikTok">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-5 sm:pt-6 md:pt-8 mt-5 sm:mt-6 md:mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
            <p className="text-gray-400 text-xs sm:text-sm text-center md:text-left">
              © {currentYear} FitFlow. Всички права запазени.
            </p>
            <div className="flex gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
              <Link href="/terms" className="text-gray-400 hover:text-[#FB7D00] transition-colors">
                Условия
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-[#FB7D00] transition-colors">
                Поверителност
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-[#FB7D00] transition-colors">
                Бисквитки
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
