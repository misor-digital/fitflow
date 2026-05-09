'use client';

import { useState } from 'react';

const TEMPLATES: { key: string; label: string; group: string }[] = [
  // Order
  { key: 'order-confirmation', label: 'Потвърждение на поръчка (с персонализация + промо)', group: 'Поръчки' },
  { key: 'order-confirmation-simple', label: 'Потвърждение на поръчка (без персонализация)', group: 'Поръчки' },
  // Subscription
  { key: 'sub-created', label: 'Нов абонамент', group: 'Абонаменти' },
  { key: 'sub-conversion', label: 'Конвертиране на поръчка в абонамент', group: 'Абонаменти' },
  { key: 'sub-paused', label: 'Абонамент на пауза', group: 'Абонаменти' },
  { key: 'sub-resumed', label: 'Абонамент възобновен', group: 'Абонаменти' },
  { key: 'sub-cancelled', label: 'Абонамент отменен', group: 'Абонаменти' },
  { key: 'frequency-changed', label: 'Честота променена', group: 'Абонаменти' },
  { key: 'address-changed', label: 'Адрес променен', group: 'Абонаменти' },
  { key: 'preferences-updated', label: 'Предпочитания обновени', group: 'Абонаменти' },
  // Delivery
  { key: 'delivery-upcoming', label: 'Предстояща доставка', group: 'Доставки' },
  { key: 'delivery-reminder', label: 'Напомняне за доставка (1-во)', group: 'Доставки' },
  { key: 'delivery-reminder-2', label: 'Напомняне за доставка (2-ро)', group: 'Доставки' },
  { key: 'delivery-reminder-3', label: 'Напомняне за доставка (3-то)', group: 'Доставки' },
  { key: 'delivery-auto-confirmed', label: 'Доставка автоматично потвърдена', group: 'Доставки' },
  // Auth
  { key: 'customer-invite', label: 'Покана за клиент', group: 'Акаунт' },
  { key: 'staff-invite', label: 'Покана за служител', group: 'Акаунт' },
  { key: 'magic-registration', label: 'Магически линк – регистрация', group: 'Акаунт' },
  { key: 'magic-login', label: 'Магически линк – вход', group: 'Акаунт' },
  { key: 'email-confirmation', label: 'Потвърждение на имейл', group: 'Акаунт' },
  { key: 'password-reset', label: 'Смяна на парола', group: 'Акаунт' },
  { key: 'otp-verification', label: 'OTP код', group: 'Акаунт' },
  { key: 'profile-updated', label: 'Профил обновен', group: 'Акаунт' },
  { key: 'account-deleted', label: 'Акаунт изтрит', group: 'Акаунт' },
];

const GROUPS = Array.from(new Set(TEMPLATES.map((t) => t.group)));

export default function EmailPreviewPage() {
  const [selected, setSelected] = useState<string>(TEMPLATES[0].key);

  const previewUrl = `/api/admin/email-preview?template=${selected}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">Преглед на имейл шаблони</h1>
        <p className="text-sm text-gray-500 mt-1">
          Изберете шаблон от списъка. Данните са примерни.
        </p>
      </div>

      <div className="flex gap-6 min-h-[80vh]">
        {/* Sidebar – template list */}
        <aside className="w-72 shrink-0 bg-white rounded-xl shadow-sm border overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b sticky top-0">
                {group}
              </div>
              {TEMPLATES.filter((t) => t.group === group).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelected(t.key)}
                  className={`w-full text-left px-4 py-3 text-sm border-b last:border-b-0 transition-colors ${
                    selected === t.key
                      ? 'bg-[var(--color-brand-orange)] text-white font-medium'
                      : 'text-gray-700 hover:bg-orange-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Preview pane */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              {selected}
            </span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-brand-orange)] font-medium hover:underline"
            >
              Отвори в нов таб ↗
            </a>
          </div>
          <iframe
            key={selected}
            src={previewUrl}
            className="flex-1 w-full rounded-xl border shadow-sm bg-white"
            title={`Email preview: ${selected}`}
          />
        </div>
      </div>
    </div>
  );
}
