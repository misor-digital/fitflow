import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Потвърждаване на доставка | FitFlow',
};

export default async function DeliveryConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const messages: Record<string, { title: string; description: string; icon: string }> = {
    success: {
      title: 'Доставката е потвърдена!',
      description: 'Благодарим ви, че потвърдихте получаването на поръчката.',
      icon: '✅',
    },
    already: {
      title: 'Вече потвърдена',
      description: 'Тази доставка вече беше потвърдена.',
      icon: 'ℹ️',
    },
    invalid: {
      title: 'Невалиден линк',
      description:
        'Линкът е невалиден или е изтекъл. Моля, влезте в акаунта си, за да потвърдите доставката.',
      icon: '⚠️',
    },
    'invalid-status': {
      title: 'Невалиден статус',
      description: 'Поръчката не е в статус, който позволява потвърждаване на доставка.',
      icon: '⚠️',
    },
    'not-found': {
      title: 'Поръчката не е намерена',
      description: 'Не можахме да намерим тази поръчка.',
      icon: '❌',
    },
    error: {
      title: 'Грешка',
      description:
        'Възникна грешка при потвърждаване на доставката. Моля, опитайте отново или се свържете с нас.',
      icon: '❌',
    },
  };

  const msg = messages[status ?? ''] ?? messages.error;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">{msg.icon}</div>
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-2">{msg.title}</h1>
        <p className="text-gray-600 mb-6">{msg.description}</p>
        <Link
          href="/account/orders"
          className="inline-block px-6 py-3 rounded-lg bg-[var(--color-brand-orange)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Към моите поръчки
        </Link>
      </div>
    </div>
  );
}
