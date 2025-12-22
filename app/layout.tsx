import type { Metadata } from "next";
import "./globals.css";
import SlidingBanner from "@/components/SlidingBanner";

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
        <SlidingBanner />
        {children}
      </body>
    </html>
  );
}
