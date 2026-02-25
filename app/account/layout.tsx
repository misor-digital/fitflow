import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AccountNav from '@/components/AccountNav';

/**
 * Account section layout.
 *
 * NOTE: Do NOT put auth checks here — layouts don't re-render on navigation.
 * Each page component must call requireAuth() individually.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-16 pb-12 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AccountNav />
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
