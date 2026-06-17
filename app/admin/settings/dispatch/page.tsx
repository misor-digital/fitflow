import { requireStaff } from '@/lib/auth';
import Link from 'next/link';
import type { Metadata } from 'next';
import SpeedySetupClient from '@/app/admin/speedy/SpeedySetupClient';
import ParcelConfigEditor from '@/components/admin/ParcelConfigEditor';
import { getDeliveryConfigMap } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Настройки за изпращане | Администрация | FitFlow',
};

export default async function DispatchSettingsPage() {
  await requireStaff(['super_admin', 'admin']);

  // Read env vars server-side for display (masked where sensitive)
  const speedyUsername = process.env.SPEEDY_USERNAME || '—';
  const speedyClientId = process.env.SPEEDY_CLIENT_ID || '—';
  const speedyServiceId = process.env.SPEEDY_SERVICE_ID || '505';

  // Read parcel config from DB
  const configMap = await getDeliveryConfigMap();
  const parcelConfig = {
    weight: configMap.PARCEL_WEIGHT_KG || '1.36',
    width: configMap.PARCEL_WIDTH_CM || '19',
    depth: configMap.PARCEL_DEPTH_CM || '26.5',
    height: configMap.PARCEL_HEIGHT_CM || '10',
    contents: configMap.PARCEL_CONTENTS || 'КУТИЯ СЪС СПОРТНИ СТОКИ',
    package: configMap.PARCEL_PACKAGE || 'КАШОН',
    dropoffOfficeId: configMap.SPEEDY_DROPOFF_OFFICE_ID || '189',
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Назад към настройки
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Настройки за изпращане (Speedy)
      </h1>

      {/* Speedy account (read-only from env) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Speedy акаунт
        </h2>
        <div className="bg-gray-50 rounded-xl border p-5 space-y-3 text-sm">
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <span className="text-gray-500 font-medium">Speedy потребител:</span>
            <code className="bg-white px-2 py-0.5 rounded border text-xs">{speedyUsername}</code>
          </div>
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <span className="text-gray-500 font-medium">Client ID:</span>
            <code className="bg-white px-2 py-0.5 rounded border text-xs">{speedyClientId}</code>
          </div>
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <span className="text-gray-500 font-medium">Service ID:</span>
            <code className="bg-white px-2 py-0.5 rounded border text-xs">{speedyServiceId}</code>
          </div>
          <p className="text-xs text-gray-400 pt-2 border-t">
            Тези стойности се задават в <code>.env</code>. За промяна е необходим deploy.
          </p>
        </div>
      </section>

      {/* Parcel defaults (editable from DB) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Параметри на пратката по подразбиране
        </h2>
        <ParcelConfigEditor initialConfig={parcelConfig} />
      </section>

      {/* Speedy API Discovery Tool */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Откриване на Speedy API стойности
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Използвайте този инструмент за да откриете <code>SPEEDY_CLIENT_ID</code> и <code>SPEEDY_SERVICE_ID</code> при първоначална настройка или смяна на акаунт.
        </p>
        <SpeedySetupClient />
      </section>
    </div>
  );
}
