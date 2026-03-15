import { getFeedbackFormBySlug, hasUserResponded } from '@/lib/data/feedback-forms';
import { verifySession } from '@/lib/auth/dal';
import { notFound } from 'next/navigation';
import DynamicFeedbackForm from '@/components/DynamicFeedbackForm';
import type { Metadata } from 'next';
import Link from 'next/link';

interface FeedbackPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: FeedbackPageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await getFeedbackFormBySlug(slug);
  if (!form) return { title: 'Формуляр не е намерен | FitFlow' };

  return {
    title: `${form.title} | FitFlow`,
    description: form.description ?? 'Споделете вашата обратна връзка.',
  };
}

export default async function FeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const form = await getFeedbackFormBySlug(slug);
  if (!form) notFound();

  // Token-gated access
  if (form.access_token) {
    const token = typeof query.token === 'string' ? query.token : null;
    if (token !== form.access_token) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-xl font-bold text-[var(--color-brand-navy)] mb-2">
              Ограничен достъп
            </h1>
            <p className="text-gray-600 text-sm">
              Този формуляр е достъпен само чрез специален линк, изпратен по имейл.
            </p>
            <Link href="/" className="text-sm text-[var(--color-brand-orange)] hover:underline mt-4 inline-block">
              ← Към началната страница
            </Link>
          </div>
        </div>
      );
    }
  }

  // Check time window
  const now = new Date();
  const notYetOpen = form.starts_at && new Date(form.starts_at) > now;
  const expired = form.ends_at && new Date(form.ends_at) < now;

  if (notYetOpen || expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-xl font-bold text-[var(--color-brand-navy)] mb-2">
            {form.title}
          </h1>
          <p className="text-gray-600 text-sm">
            {notYetOpen
              ? 'Този формуляр все още не е активен.'
              : 'Този формуляр вече не приема отговори.'}
          </p>
          <Link href="/" className="text-sm text-[var(--color-brand-orange)] hover:underline mt-4 inline-block">
            ← Към началната страница
          </Link>
        </div>
      </div>
    );
  }

  // Auth + duplicate checks
  const session = await verifySession().catch(() => null);
  const userId = session?.userId ?? null;

  if (form.settings.requireAuth && !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-xl font-bold text-[var(--color-brand-navy)] mb-2">
            Изисква се вход
          </h1>
          <p className="text-gray-600 text-sm">
            Трябва да влезете в акаунта си, за да попълните този формуляр.
          </p>
          <Link href="/login" className="text-sm text-[var(--color-brand-orange)] hover:underline mt-4 inline-block">
            → Вход в акаунта
          </Link>
        </div>
      </div>
    );
  }

  if (!form.settings.allowMultiple && userId) {
    const alreadySubmitted = await hasUserResponded(form.id, userId);
    if (alreadySubmitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-[var(--color-brand-navy)] mb-2">
              Вече сте отговорили
            </h1>
            <p className="text-gray-600 text-sm">
              Вече сте изпратили отговор за този формуляр. Благодарим!
            </p>
            <Link href="/" className="text-sm text-[var(--color-brand-orange)] hover:underline mt-4 inline-block">
              ← Към началната страница
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-extrabold italic text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] transition-colors">
            FitFlow
          </Link>
        </div>

        {/* Form card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[var(--color-brand-navy)] mb-1">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-sm text-gray-600">{form.description}</p>
          )}
          <hr className="border-gray-200 my-4" />

          <div>
            <DynamicFeedbackForm
              slug={form.slug}
              schema={form.schema}
              settings={form.settings}
              accessToken={form.access_token}
            />
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} FitFlow
        </p>
      </div>
    </div>
  );
}
