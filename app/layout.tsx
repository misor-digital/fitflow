import type { Metadata } from "next";
import "./globals.css";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ConditionalScripts from "@/components/ConditionalScripts";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "FitFlow - Кутия за АКТИВНИ дами",
  description: "Спортно облекло, аксесоари, протеинови продукти, добавки и мотивация на едно място",
  keywords: "фитнес кутия, спортна кутия, абонамент, спортно облекло, протеини, фитнес",
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
        <ConditionalScripts 
          googleAnalyticsId={process.env.NEXT_PUBLIC_GA_ID ?? ''}
          facebookPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''}
          googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? ''}
        />
      </body>
    </html>
  );
}
