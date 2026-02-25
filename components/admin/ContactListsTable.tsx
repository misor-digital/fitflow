'use client';

import { useState, useTransition } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ContactList {
  id: number;
  name: string;
  totalSubscribers: number;
  totalBlacklisted: number;
  isConfigured: boolean;
  configKey: string | null;
}

interface ContactListsTableProps {
  lists: ContactList[];
}

// ============================================================================
// Helpers
// ============================================================================

const CONFIG_KEY_LABELS: Record<string, string> = {
  customers: 'Клиенти',
  subscribers: 'Абонати',
  preorders: 'Предварителни',
  newsletter: 'Бюлетин',
  legacyPreorders: 'Legacy Предварителни',
};

function formatNumber(n: number): string {
  return n.toLocaleString('bg-BG');
}

// ============================================================================
// Component
// ============================================================================

export default function ContactListsTable({ lists }: ContactListsTableProps) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    scope: string;
    synced: number;
    failed: number;
  } | null>(null);
  const [, startTransition] = useTransition();

  async function handleSyncScope(scope: string) {
    setSyncing(scope);
    setSyncResult(null);

    try {
      const res = await fetch('/api/admin/contacts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();

      if (data.success) {
        setSyncResult({
          scope,
          synced: data.synced ?? 0,
          failed: data.failed ?? 0,
        });
      } else {
        setSyncResult({ scope, synced: 0, failed: -1 });
      }
    } catch {
      setSyncResult({ scope, synced: 0, failed: -1 });
    } finally {
      setSyncing(null);
    }
  }

  // Separate configured and other lists
  const configuredLists = lists.filter((l) => l.isConfigured);
  const otherLists = lists.filter((l) => !l.isConfigured);

  return (
    <div className="space-y-6">
      {/* Sync result banner */}
      {syncResult && (
        <div
          className={`rounded-lg p-3 text-sm ${
            syncResult.failed === -1
              ? 'bg-red-50 text-red-700'
              : syncResult.failed > 0
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-green-50 text-green-700'
          }`}
        >
          {syncResult.failed === -1 ? (
            'Грешка при синхронизация.'
          ) : (
            <>
              Синхронизация ({syncResult.scope}): {formatNumber(syncResult.synced)} успешни
              {syncResult.failed > 0 && `, ${formatNumber(syncResult.failed)} неуспешни`}
            </>
          )}
        </div>
      )}

      {/* Configured Lists */}
      {configuredLists.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Конфигурирани листи
          </h3>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Лист</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Конфиг. ключ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Абонати</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Блокирани</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configuredLists.map((list) => (
                  <tr key={list.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                        <span className="font-medium text-gray-900">{list.name}</span>
                        <span className="text-xs text-gray-400">#{list.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {list.configKey ? CONFIG_KEY_LABELS[list.configKey] ?? list.configKey : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {formatNumber(list.totalSubscribers)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {formatNumber(list.totalBlacklisted)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {list.configKey && ['customers', 'subscribers', 'preorders'].includes(list.configKey) && (
                        <button
                          onClick={() => {
                            startTransition(() => {
                              handleSyncScope(list.configKey!);
                            });
                          }}
                          disabled={syncing !== null}
                          className="text-xs font-medium text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {syncing === list.configKey ? 'Синхронизира...' : 'Синхронизирай'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Lists */}
      {otherLists.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Други Brevo листи
          </h3>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Лист</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Абонати</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Блокирани</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherLists.map((list) => (
                  <tr key={list.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-gray-900">{list.name}</span>
                        <span className="text-xs text-gray-400">#{list.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {formatNumber(list.totalSubscribers)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {formatNumber(list.totalBlacklisted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {lists.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <p>Няма намерени Brevo листи.</p>
          <p className="text-sm mt-1">Проверете Brevo API ключа и конфигурацията.</p>
        </div>
      )}
    </div>
  );
}
