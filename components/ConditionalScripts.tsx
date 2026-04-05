'use client';

import Script from 'next/script';
import { useConsentStore } from '@/lib/consent';

/**
 * Conditional script loading based on cookie consent
 * Scripts only load after user has given explicit consent for the relevant category
 * 
 * GDPR Compliance:
 * - No analytics/marketing scripts load before consent
 * - Scripts are loaded dynamically after consent is given
 * - If consent is revoked, scripts won't load on next page visit
 *   (Note: Already loaded scripts cannot be unloaded without page refresh)
 */

interface ConditionalScriptsProps {
  // Google Analytics Measurement ID
  googleAnalyticsId?: string;
  // Facebook Pixel ID
  facebookPixelId?: string;
  // Google Ads Conversion ID
  googleAdsId?: string;
}

export default function ConditionalScripts({
  googleAnalyticsId,
  facebookPixelId,
  googleAdsId,
}: ConditionalScriptsProps) {
  const { isLoaded, preferences } = useConsentStore();

  // Only load analytics/marketing scripts in production
  if (process.env.NODE_ENV !== 'production') return null;

  // Don't render anything until consent state is loaded
  if (!isLoaded) return null;

  return (
    <>
      {/* Google Analytics - requires analytics consent */}
      {preferences.analytics && googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}', {
                anonymize_ip: true,
                cookie_flags: 'SameSite=None;Secure'
              });
            `}
          </Script>
        </>
      )}

      {/* Facebook Pixel - requires marketing consent */}
      {preferences.marketing && facebookPixelId && (
        <>
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebookPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
          <Script id="capi-pageview" strategy="afterInteractive">
            {`
              (function() {
                var eventId = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
                var fbp = (document.cookie.match(/(?:^|;\\s*)_fbp=([^;]*)/) || [])[1];
                var fbc = (document.cookie.match(/(?:^|;\\s*)_fbc=([^;]*)/) || [])[1];
                fetch('/api/analytics/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    eventName: 'PageView',
                    eventId: eventId,
                    fbp: fbp || undefined,
                    fbc: fbc || undefined,
                    sourceUrl: window.location.href
                  }),
                  keepalive: true
                }).catch(function(){});
              })();
            `}
          </Script>
        </>
      )}

      {/* Google Ads - requires marketing consent */}
      {preferences.marketing && googleAdsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAdsId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
