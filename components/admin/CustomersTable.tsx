'use client';

import type { CustomerWithStats } from '@/lib/supabase/types';

/** Mask a full name: show first character + '***' */
function maskName(name: string): string {
  if (!name) return '—';
  return name.charAt(0) + '***';
}

/** Mask an email: show first 2 chars + '***@' + domain */
function maskEmail(email: string): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return local.slice(0, 2) + '***@' + domain;
}

/** Mask a phone: show only last 4 digits */
function maskPhone(phone: string | null): string {
  if (!phone) return '—';
  if (phone.length <= 4) return '***';
  return '***' + phone.slice(-4);
}

interface CustomersTableProps {
  customers: CustomerWithStats[];
  total: number;
  currentPage: number;
  perPage: number;
}

export function CustomersTable({
  customers,
  total,
  currentPage,
  perPage,
}: CustomersTableProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  return (
    <div>
      {/* Results summary */}
      <p className="text-sm text-gray-500 mb-3">
        Показване на {start}–{end} от {total} клиенти
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Име
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Имейл
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Телефон
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Абонат
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Поръчки
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Абонамент
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Последна поръчка
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Регистрация
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Name — masked with tooltip */}
                  <td className="px-4 py-3">
                    <span className="relative group cursor-default">
                      <span>{maskName(customer.full_name)}</span>
                      <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg">
                        {customer.full_name}
                      </span>
                    </span>
                  </td>

                  {/* Email — masked with tooltip */}
                  <td className="px-4 py-3">
                    <span className="relative group cursor-default">
                      <span className="text-gray-600">
                        {maskEmail(customer.email)}
                      </span>
                      <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg">
                        {customer.email || '—'}
                      </span>
                    </span>
                  </td>

                  {/* Phone — masked with tooltip */}
                  <td className="px-4 py-3">
                    <span className="relative group cursor-default">
                      <span className="text-gray-600">
                        {maskPhone(customer.phone)}
                      </span>
                      {customer.phone && (
                        <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg">
                          {customer.phone}
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Subscriber badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        customer.is_subscriber
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {customer.is_subscriber ? 'Да' : 'Не'}
                    </span>
                  </td>

                  {/* Order count */}
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {customer.order_count}
                  </td>

                  {/* Active subscription badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        customer.has_active_subscription
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {customer.has_active_subscription ? 'Активен' : 'Няма'}
                    </span>
                  </td>

                  {/* Last order date */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {customer.last_order_date
                      ? new Date(
                          customer.last_order_date,
                        ).toLocaleDateString('bg-BG')
                      : '—'}
                  </td>

                  {/* Registration date */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString('bg-BG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
