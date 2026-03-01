import type { Metadata } from "next";
import "./globals.css";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import OrderTrackingWidget from "@/components/OrderTrackingWidget";
import ConditionalScripts from "@/components/ConditionalScripts";
import AuthProvider from "@/components/AuthProvider";
import { initializeEmailSystem } from "@/lib/data";

// Wire DAL callbacks into Brevo wrapper (idempotent)
initializeEmailSystem();

export const metadata: Metadata = {
  title: "FitFlow - Кутия за АКТИВНИ дами",
  description: "Спортно облекло, аксесоари, протеинови продукти, добавки и мотивация на едно място",
  keywords: "спортна кутия, абонамент, спортно облекло, протеини, фитнес",
  openGraph: {
    title: "FitFlow - Кутия за АКТИВНИ дами",
    description: "Спортно облекло, аксесоари, протеинови продукти, добавки и мотивация на едно място",
    type: "website",
    locale: "bg_BG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <CookieConsentBanner />
        <OrderTrackingWidget />
        <ConditionalScripts 
          googleAnalyticsId={process.env.NEXT_PUBLIC_GA_ID ?? ''}
          facebookPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''}
          googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? ''}
        />
      </body>
    </html>
  );
}
