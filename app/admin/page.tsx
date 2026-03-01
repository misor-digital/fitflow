import { requireStaff } from '@/lib/auth';
import { getOrdersCount, getSubscriptionsCount, getSubscriptionMRR, getSiteConfig, getEurToBgnRate } from '@/lib/data';
import { getStaffCount } from '@/lib/data/customers';

export const metadata = {
  title: 'Табло | FitFlow Admin',
};

export default async function AdminDashboard() {
  const session = await requireStaff();

  // Basic stats
  const [orderCount, staffCount, subscriptionCounts, mrr, cronLastRun, cronLastResult, eurToBgnRate] = await Promise.all([
    getOrdersCount(),
    getStaffCount(),
    getSubscriptionsCount(),
    getSubscriptionMRR(),
    getSiteConfig('cron_last_run'),
    getSiteConfig('cron_last_result'),
    getEurToBgnRate(),
  ]);

  const parsedCronResult = cronLastResult ? (() => {
    try { return JSON.parse(cronLastResult); } catch { return null; }
  })() : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Добре дошли, {session.profile.full_name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Общо поръчки</p>
          <p className="text-3xl font-bold text-[var(--color-brand-navy)]">
            {orderCount}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Служители</p>
          <p className="text-3xl font-bold text-[var(--color-brand-navy)]">
            {staffCount}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Ваша роля</p>
          <p className="text-3xl font-bold text-[var(--color-brand-orange)] capitalize">
            {session.profile.staff_role?.replace('_', ' ')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">🔄 Активни абонаменти</p>
          <p className="text-3xl font-bold text-green-700">
            {subscriptionCounts.active}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">💰 MRR</p>
          <p className="text-3xl font-bold text-[var(--color-brand-navy)]">
            €{mrr.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">{(mrr * eurToBgnRate).toFixed(2)} лв</p>
        </div>
      </div>

      {/* Placeholder for charts, recent orders, etc. */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Последно автоматично генериране
        </h2>
        {cronLastRun ? (
          <div className="space-y-1 text-sm">
            <p className="text-gray-500">
              Последно изпълнение:{' '}
              <span className="font-medium text-gray-700">
                {new Date(cronLastRun).toLocaleString('bg-BG', { timeZone: 'Europe/Sofia' })}
              </span>
            </p>
            {parsedCronResult && !parsedCronResult.error && (
              <p className="text-gray-500">
                Генерирани: <span className="font-medium text-green-700">{parsedCronResult.generated ?? 0}</span>
                {' | '}Пропуснати: <span className="font-medium text-gray-700">{parsedCronResult.skipped ?? 0}</span>
                {' | '}Изключени: <span className="font-medium text-gray-700">{parsedCronResult.excluded ?? 0}</span>
                {parsedCronResult.errors > 0 && (
                  <>
                    {' | '}Грешки: <span className="font-medium text-red-600">{parsedCronResult.errors}</span>
                  </>
                )}
              </p>
            )}
            {parsedCronResult?.error && (
              <p className="text-red-600">
                ⚠ Грешка: {parsedCronResult.error}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Все още няма изпълнение на cron задачата.</p>
        )}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-400 text-center py-12">
          Детайлни статистики — очаквайте скоро
        </p>
      </div>
    </div>
  );
}
