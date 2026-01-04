/**
 * Unsubscribe confirmation page
 */

import { Suspense } from 'react';

function UnsubscribeContent() {
  return (
    <div className="min-h-screen bg-[#f6f3f0] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#363636] mb-2">FitFlow</h1>
          <p className="text-sm text-[#7a4a2a]">Защото можем</p>
        </div>
        
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#363636] mb-2">
            Успешно се отписахте
          </h2>
          <p className="text-[#4a5568]">
            Вече няма да получавате маркетингови имейли от нас.
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-[#7a4a2a] mb-4">
            Ако това е грешка или искате да се абонирате отново, 
            моля свържете се с нас.
          </p>
          <a 
            href="mailto:info@fitflow.bg"
            className="inline-block px-6 py-2 bg-gradient-to-r from-[#9c3b00] to-[#ff6a00] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Свържете се с нас
          </a>
        </div>
        
        <div className="mt-8">
          <a 
            href="/"
            className="text-[#9c3b00] hover:underline text-sm"
          >
            ← Обратно към началната страница
          </a>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f3f0] flex items-center justify-center">
        <div className="text-[#7a4a2a]">Зареждане...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
