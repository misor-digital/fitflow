import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: 'Нулиране на парола | FitFlow',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-8">
          Нулиране на парола
        </h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
