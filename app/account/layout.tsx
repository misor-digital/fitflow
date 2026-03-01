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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:gap-8">
            <div className="shrink-0 md:sticky md:top-24 md:self-start">
              <AccountNav />
            </div>
            <div className="flex-1 min-w-0 max-w-3xl">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
