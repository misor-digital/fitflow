import Link from 'next/link';

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-[var(--color-brand-navy)] mb-4">
          Нямате достъп
        </h1>
        <p className="text-gray-600 mb-8">
          Нямате необходимите права за тази страница.
        </p>
        <Link
          href="/"
          className="bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Към началото
        </Link>
      </div>
    </div>
  );
}
