/**
 * Customer Auth Callback Page
 * URL: /account/auth/callback
 * 
 * Handles magic link verification and redirects
 * This page is the target of magic link emails
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Get the current session (Supabase SSR client handles token exchange automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setStatus('error');
          setErrorMessage('Невалиден или изтекъл линк. Моля, поискайте нов.');
          return;
        }

        // Ensure customer profile exists
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, user_id')
          .eq('user_id', session.user.id)
          .single();

        // If no customer profile exists, create one from user metadata
        if (customerError || !customer) {
          const fullName = session.user.user_metadata?.full_name || 'Customer';
          const phone = session.user.user_metadata?.phone || null;
          const preferredLanguage = session.user.user_metadata?.preferred_language || 'bg';
          const marketingConsent = session.user.user_metadata?.marketing_consent || false;

          const { error: createError } = await supabase
            .from('customers')
            .insert({
              user_id: session.user.id,
              full_name: fullName,
              phone,
              preferred_language: preferredLanguage,
              marketing_consent: marketingConsent,
              marketing_consent_date: marketingConsent ? new Date().toISOString() : null,
            });

          if (createError) {
            console.error('Error creating customer profile:', createError);
            setStatus('error');
            setErrorMessage('Грешка при създаване на профил. Моля, свържете се с поддръжката.');
            return;
          }
        }

        // Success - redirect to requested page or account dashboard
        setStatus('success');
        const redirect = searchParams?.get('redirect');
        const targetUrl = redirect && redirect.startsWith('/') && !redirect.startsWith('//') 
          ? redirect 
          : '/account';
        
        router.push(targetUrl);
        router.refresh();
      } catch (error) {
        console.error('Error in auth callback:', error);
        setStatus('error');
        setErrorMessage('Грешка при влизане. Моля, опитайте отново.');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FitFlow</h1>
          <p className="text-blue-200">Вход в профила</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Влизане...</h2>
              <p className="text-gray-600">Моля, изчакайте</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Успешно влизане!</h2>
              <p className="text-gray-600">Пренасочване...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Грешка</h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <a
                href="/account/login"
                className="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-900 transition"
              >
                Опитайте отново
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
