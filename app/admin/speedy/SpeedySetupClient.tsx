'use client';

import { useState } from 'react';

interface ContractClient {
  clientId: number;
  clientName: string;
  contactName: string;
  address: Record<string, unknown>;
  email: string;
  phone: string;
}

interface ServiceItem {
  serviceId: number;
  name: string;
  nameEn: string;
}

export default function SpeedySetupClient() {
  const [clients, setClients] = useState<ContractClient[] | null>(null);
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [loading, setLoading] = useState<'contract' | 'services' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipientSiteId, setRecipientSiteId] = useState('68134');
  const [senderClientId, setSenderClientId] = useState('');

  async function fetchContract() {
    setLoading('contract');
    setError(null);
    try {
      const res = await fetch('/api/admin/speedy/contract');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setClients(data.clients ?? []);
      if (data.clients?.[0]?.clientId) {
        setSenderClientId(String(data.clients[0].clientId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  }

  async function fetchServices() {
    if (!senderClientId || !recipientSiteId) return;
    setLoading('services');
    setError(null);
    try {
      const res = await fetch('/api/admin/speedy/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderClientId: Number(senderClientId),
          recipientSiteId: Number(recipientSiteId),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setServices(data.services ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Contract Clients */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          1. Contract Clients
        </h2>
        <button
          onClick={fetchContract}
          disabled={loading === 'contract'}
          className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {loading === 'contract' ? 'Зареждане...' : 'Извлечи от Speedy'}
        </button>

        {clients && (
          <div className="mt-4 space-y-3">
            {clients.length === 0 && (
              <p className="text-sm text-gray-500">Няма намерени клиенти.</p>
            )}
            {clients.map((c) => (
              <div key={c.clientId} className="bg-gray-50 p-4 rounded-lg border text-sm space-y-1">
                <div><strong>clientId:</strong> <code className="bg-yellow-100 px-1 rounded">{c.clientId}</code></div>
                <div><strong>Име:</strong> {c.clientName}</div>
                <div><strong>Контакт:</strong> {c.contactName}</div>
                <div><strong>Email:</strong> {c.email}</div>
                <div><strong>Телефон:</strong> {c.phone}</div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">Адрес (JSON)</summary>
                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(c.address, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
            {clients.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                <strong>Добави в .env:</strong>
                <code className="block mt-1 bg-white px-2 py-1 rounded border text-xs">
                  SPEEDY_CLIENT_ID={clients[0].clientId}
                </code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Destination Services */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          2. Destination Services
        </h2>
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sender Client ID</label>
            <input
              type="number"
              value={senderClientId}
              onChange={(e) => setSenderClientId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-36"
              placeholder="от стъпка 1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Recipient Site ID</label>
            <input
              type="number"
              value={recipientSiteId}
              onChange={(e) => setRecipientSiteId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-36"
              placeholder="68134 (София)"
            />
          </div>
          <button
            onClick={fetchServices}
            disabled={loading === 'services' || !senderClientId || !recipientSiteId}
            className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading === 'services' ? 'Зареждане...' : 'Провери услуги'}
          </button>
        </div>

        {services && (
          <div className="mt-4">
            {services.length === 0 && (
              <p className="text-sm text-gray-500">Няма налични услуги за тази дестинация.</p>
            )}
            {services.length > 0 && (
              <div className="overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 border">Service ID</th>
                      <th className="text-left p-2 border">Име</th>
                      <th className="text-left p-2 border">Name (EN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.serviceId} className="hover:bg-gray-50">
                        <td className="p-2 border font-mono">{s.serviceId}</td>
                        <td className="p-2 border">{s.name}</td>
                        <td className="p-2 border">{s.nameEn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm mt-3">
                  <strong>Добави в .env:</strong>
                  <code className="block mt-1 bg-white px-2 py-1 rounded border text-xs">
                    SPEEDY_SERVICE_ID={services[0].serviceId}
                  </code>
                  <span className="text-xs text-gray-500 mt-1 block">
                    (или избери друг serviceId от таблицата)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
