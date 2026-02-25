import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-[var(--color-brand-navy)] mb-4">
          Необходимо е вход във системата
        </h1>
        <p className="text-gray-600 mb-8">
          Моля, впишете се за да продължите.
        </p>
        <Link
          href="/login"
          className="bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Вход
        </Link>
      </div>
    </div>
  );
}
