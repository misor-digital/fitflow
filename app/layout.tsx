import type { Metadata } from "next";
import "./globals.css";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ConditionalScripts from "@/components/ConditionalScripts";
import { CutoffBanner } from "@/components/banners/CutoffBanner";
import { MarathonBanner } from "@/components/banners/MarathonBanner";
import { DonationBubble } from "@/components/banners/DonationBubble";
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
  other: {
    "facebook-domain-verification": "n8g7hh3b83sgf31873xafdk39027pb",
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
          {/* Marathon charity banner takes priority during May 2026; falls back to cutoff banner otherwise */}
          <MarathonBanner />
          <CutoffBanner />
          {children}
        </AuthProvider>
        <CookieConsentBanner />
        <DonationBubble />
        <ConditionalScripts 
          googleAnalyticsId={process.env.NEXT_PUBLIC_GA_ID ?? ''}
          facebookPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''}
          googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? ''}
        />
      </body>
    </html>
  );
}
