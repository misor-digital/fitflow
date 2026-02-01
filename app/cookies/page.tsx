import { Metadata } from 'next';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import LegalContent from '@/components/LegalContent';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import { getLegalDocument, SLUG_TO_TITLE, SLUG_TO_DESCRIPTION } from '@/lib/legal';

export const metadata: Metadata = {
  title: `${SLUG_TO_TITLE.cookies} | FitFlow`,
  description: SLUG_TO_DESCRIPTION.cookies,
  openGraph: {
    title: `${SLUG_TO_TITLE.cookies} | FitFlow`,
    description: SLUG_TO_DESCRIPTION.cookies,
    type: 'website',
    locale: 'bg_BG',
  },
};

export default async function CookiesPage() {
  const document = await getLegalDocument('cookies');

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-white pt-8 sm:pt-10 pb-16 px-5">
        <div className="max-w-4xl mx-auto mt-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-[#FB7D00]">Начало</Link>
            <span className="mx-2">/</span>
            <span className="text-[#023047]">{document.title}</span>
          </nav>

          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
            {/* Cookie Settings CTA */}
            <div className="mb-8 p-6 bg-gradient-to-r from-[#FB7D00]/10 to-[#023047]/10 rounded-xl border border-[#FB7D00]/20">
              <h2 className="text-lg font-semibold text-[#023047] mb-3">
                Управление на бисквитките
              </h2>
              <p className="text-gray-600 mb-4">
                Можете да промените настройките си за бисквитки по всяко време, като използвате бутона по-долу.
              </p>
              <CookieSettingsButton />
            </div>

            <LegalContent contentHtml={document.contentHtml} />
            
            {/* Last Updated */}
            <div className="mt-10 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Последна актуализация: Декември 2025
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
