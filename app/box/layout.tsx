import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function BoxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
