import { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import LegalContent from '@/components/LegalContent';
import { getLegalDocument, SLUG_TO_TITLE, SLUG_TO_DESCRIPTION } from '@/lib/legal';

export const metadata: Metadata = {
  title: `${SLUG_TO_TITLE.terms} | FitFlow`,
  description: SLUG_TO_DESCRIPTION.terms,
  openGraph: {
    title: `${SLUG_TO_TITLE.terms} | FitFlow`,
    description: SLUG_TO_DESCRIPTION.terms,
    type: 'website',
    locale: 'bg_BG',
  },
};

export default async function TermsPage() {
  const document = await getLegalDocument('terms');

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-white pt-24 pb-16 px-5">
        <div className="max-w-4xl mx-auto mt-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6">
            <a href="/" className="hover:text-[#FB7D00]">Начало</a>
            <span className="mx-2">/</span>
            <span className="text-[#023047]">{document.title}</span>
          </nav>

          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
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
