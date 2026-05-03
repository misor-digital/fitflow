'use client';

import { useState, useCallback } from 'react';

interface ParcelConfigEditorProps {
  initialConfig: {
    weight: string;
    width: string;
    depth: string;
    height: string;
    contents: string;
  };
}

export default function ParcelConfigEditor({ initialConfig }: ParcelConfigEditorProps) {
  const [weight, setWeight] = useState(initialConfig.weight);
  const [width, setWidth] = useState(initialConfig.width);
  const [depth, setDepth] = useState(initialConfig.depth);
  const [height, setHeight] = useState(initialConfig.height);
  const [contents, setContents] = useState(initialConfig.contents);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasChanges =
    weight !== initialConfig.weight ||
    width !== initialConfig.width ||
    depth !== initialConfig.depth ||
    height !== initialConfig.height ||
    contents !== initialConfig.contents;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    const updates: { key: string; value: string }[] = [];
    if (weight !== initialConfig.weight) updates.push({ key: 'PARCEL_WEIGHT_KG', value: weight });
    if (width !== initialConfig.width) updates.push({ key: 'PARCEL_WIDTH_CM', value: width });
    if (depth !== initialConfig.depth) updates.push({ key: 'PARCEL_DEPTH_CM', value: depth });
    if (height !== initialConfig.height) updates.push({ key: 'PARCEL_HEIGHT_CM', value: height });
    if (contents !== initialConfig.contents) updates.push({ key: 'PARCEL_CONTENTS', value: contents });

    try {
      for (const { key, value } of updates) {
        const res = await fetch('/api/admin/settings/delivery', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Грешка при запис на ${key}`);
        }
      }
      setMessage({ type: 'success', text: 'Запазено успешно.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Неизвестна грешка.' });
    } finally {
      setSaving(false);
    }
  }, [weight, width, depth, height, contents, initialConfig]);

  return (
    <div className="bg-gray-50 rounded-xl border p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-gray-600 font-medium mb-1">Тегло (кг)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="50"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-600 font-medium mb-1">Съдържание</label>
          <input
            type="text"
            maxLength={100}
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-600 font-medium mb-1">Ширина (см)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="200"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-600 font-medium mb-1">Дълбочина (см)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="200"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-600 font-medium mb-1">Височина (см)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="200"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-brand-navy)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {saving ? 'Запазване...' : 'Запази промените'}
      </button>
    </div>
  );
}
