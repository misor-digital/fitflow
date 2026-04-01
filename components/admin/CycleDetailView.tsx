'use client';

import { useState, useTransition, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type {
  DeliveryCycleRow,
  DeliveryCycleItemRow,
  DeliveryCycleDerivedState,
} from '@/lib/delivery';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS = [
  { value: 'protein', label: 'Протеин' },
  { value: 'supplement', label: 'Добавка' },
  { value: 'accessory', label: 'Аксесоар' },
  { value: 'clothing', label: 'Облекло' },
  { value: 'other', label: 'Друго' },
];

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Протеин',
  supplement: 'Добавка',
  accessory: 'Аксесоар',
  clothing: 'Облекло',
  other: 'Друго',
};

const CATEGORY_COLORS: Record<string, string> = {
  protein: 'bg-purple-100 text-purple-800',
  supplement: 'bg-teal-100 text-teal-800',
  accessory: 'bg-yellow-100 text-yellow-800',
  clothing: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Предстоящ',
  delivered: 'Доставен',
  archived: 'Архивиран',
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// Props
// ============================================================================

interface CycleDetailViewProps {
  cycle: DeliveryCycleRow;
  items: DeliveryCycleItemRow[];
  cycleState: DeliveryCycleDerivedState;
}

// ============================================================================
// Component
// ============================================================================

export function CycleDetailView({
  cycle,
  items: initialItems,
  cycleState,
}: CycleDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cycle fields
  const [title, setTitle] = useState(cycle.title ?? '');
  const [description, setDescription] = useState(cycle.description ?? '');

  // Items
  const [items, setItems] = useState(initialItems);

  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryCycleItemRow | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: string;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  // ============================================================================
  // Cycle field updates
  // ============================================================================

  const handleTitleBlur = useCallback(async () => {
    if (title === (cycle.title ?? '')) return;
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/delivery/${cycle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Грешка при запазване на заглавието.');
      } else {
        setSuccess('Заглавието е запазено.');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch {
      setError('Грешка при запазване на заглавието.');
    }
  }, [title, cycle.id, cycle.title]);

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const handleDescriptionBlur = async () => {
    if (description === (cycle.description ?? '')) return;
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/delivery/${cycle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Грешка при запазване на описанието.');
      } else {
        setSuccess('Описанието е запазено.');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch {
      setError('Грешка при запазване на описанието.');
    }
  };

  // ============================================================================
  // Cycle status actions
  // ============================================================================

  const handleMarkDelivered = () => {
    setShowConfirmModal({
      action: 'mark_delivered',
      title: 'Маркиране като доставен',
      message: 'Сигурни ли сте, че искате да маркирате този цикъл като доставен?',
      onConfirm: async () => {
        clearFeedback();
        startTransition(async () => {
          try {
            const res = await fetch(`/api/admin/delivery/${cycle.id}/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'mark_delivered' }),
            });
            if (!res.ok) {
              const data = await res.json();
              setError(data.error || 'Грешка при промяна на статуса.');
            } else {
              router.refresh();
            }
          } catch {
            setError('Грешка при промяна на статуса.');
          }
          setShowConfirmModal(null);
        });
      },
    });
  };

  const handleReveal = () => {
    setShowConfirmModal({
      action: 'reveal',
      title: 'Разкриване на съдържанието',
      message:
        'Това ще направи съдържанието на кутията публично видимо. Сигурни ли сте?',
      onConfirm: async () => {
        clearFeedback();
        startTransition(async () => {
          try {
            const res = await fetch(`/api/admin/delivery/${cycle.id}/reveal`, {
              method: 'POST',
            });
            if (!res.ok) {
              const data = await res.json();
              setError(data.error || 'Грешка при разкриване на цикъла.');
            } else {
              setSuccess('Цикълът е разкрит! Виж публичната страница →');
              setTimeout(() => setSuccess(null), 5000);
              router.refresh();
            }
          } catch {
            setError('Грешка при разкриване на цикъла.');
          }
          setShowConfirmModal(null);
        });
      },
    });
  };

  const handleArchive = () => {
    setShowConfirmModal({
      action: 'archive',
      title: 'Архивиране',
      message: 'Сигурни ли сте, че искате да архивирате този цикъл?',
      onConfirm: async () => {
        clearFeedback();
        startTransition(async () => {
          try {
            const res = await fetch(`/api/admin/delivery/${cycle.id}/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'archive' }),
            });
            if (!res.ok) {
              const data = await res.json();
              setError(data.error || 'Грешка при архивиране.');
            } else {
              router.refresh();
            }
          } catch {
            setError('Грешка при архивиране.');
          }
          setShowConfirmModal(null);
        });
      },
    });
  };

  const handleDeleteCycle = () => {
    setShowConfirmModal({
      action: 'delete_cycle',
      title: 'Изтриване на цикъл',
      message:
        'Сигурни ли сте, че искате да изтриете този цикъл? Това действие е необратимо.',
      onConfirm: async () => {
        clearFeedback();
        startTransition(async () => {
          try {
            const res = await fetch(`/api/admin/delivery/${cycle.id}`, {
              method: 'DELETE',
            });
            if (res.status === 204) {
              router.push('/admin/delivery');
              return;
            }
            const data = await res.json();
            setError(data.error || 'Грешка при изтриване.');
          } catch {
            setError('Грешка при изтриване на цикъла.');
          }
          setShowConfirmModal(null);
        });
      },
    });
  };

  // ============================================================================
  // Item CRUD
  // ============================================================================

  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item: DeliveryCycleItemRow) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = (item: DeliveryCycleItemRow) => {
    setShowConfirmModal({
      action: 'delete_item',
      title: 'Изтриване на артикул',
      message: `Сигурни ли сте, че искате да изтриете артикул '${item.name}'?`,
      onConfirm: async () => {
        clearFeedback();
        startTransition(async () => {
          try {
            const res = await fetch(
              `/api/admin/delivery/${cycle.id}/items/${item.id}`,
              { method: 'DELETE' },
            );
            if (res.status === 204) {
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              setSuccess('Артикулът е изтрит.');
              setTimeout(() => setSuccess(null), 2000);
            } else {
              const data = await res.json();
              setError(data.error || 'Грешка при изтриване на артикул.');
            }
          } catch {
            setError('Грешка при изтриване на артикул.');
          }
          setShowConfirmModal(null);
        });
      },
    });
  };

  const handleItemSaved = (item: DeliveryCycleItemRow, isNew: boolean) => {
    if (isNew) {
      setItems((prev) => [...prev, item]);
    } else {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
    setShowItemModal(false);
    setEditingItem(null);
    setSuccess(isNew ? 'Артикулът е добавен.' : 'Артикулът е обновен.');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Reorder: move item up or down
  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);

    try {
      await fetch(`/api/admin/delivery/${cycle.id}/items/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: newItems.map((i) => i.id) }),
      });
    } catch {
      // Revert on error
      setItems(items);
      setError('Грешка при пренареждане.');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold hover:opacity-70 transition-opacity">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success.includes('публичната страница') ? (
            <span>
              {success.replace(' →', '')}{' '}
              <a href="/box/current" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                Виж публичната страница →
              </a>
            </span>
          ) : (
            success
          )}
        </div>
      )}

      {/* Section A: Cycle Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title - editable inline */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Заглавие на цикъла"
              className="text-2xl font-bold text-[var(--color-brand-navy)] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--color-brand-orange)] focus:outline-none w-full pb-1 transition-colors"
            />
          </div>

          {/* Status badge */}
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[cycle.status]}`}
          >
            {STATUS_LABELS[cycle.status]}
          </span>
        </div>

        {/* Delivery Date */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">Дата на доставка:</span>{' '}
          <span className="font-mono">{cycleState.formattedDate}</span>
          {cycleState.daysUntilDelivery !== null && (
            <span className="ml-2 text-blue-600">
              (след {cycleState.daysUntilDelivery} дни)
            </span>
          )}
        </div>
        {cycle.status !== 'upcoming' && (
          <p className="text-sm text-amber-600">
            ⚠ Промяната на дата на цикъл, който вече е в обработка, може да обърка клиентите.
          </p>
        )}

        {/* Revealed status */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">Съдържание:</span>{' '}
          {cycleState.isRevealed ? (
            <span className="text-green-600 font-medium">
              Разкрито
              {cycle.revealed_at && (
                <span className="text-gray-400 font-normal ml-1">
                  ({new Date(cycle.revealed_at).toLocaleDateString('bg-BG')})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">Скрито</span>
          )}
        </div>

        {/* Description - editable */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Описание (публично, при разкриване)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            rows={3}
            placeholder="Описание на кутията за този месец..."
            className="w-full border rounded-lg px-3 py-2 text-sm resize-y focus:border-[var(--color-brand-orange)] focus:outline-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {cycleState.canMarkDelivered && (
            <button
              onClick={handleMarkDelivered}
              disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✓ Маркирай като доставен
            </button>
          )}
          {cycleState.canReveal && (
            <button
              onClick={handleReveal}
              disabled={isPending}
              className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              👁 Разкрий съдържанието
            </button>
          )}
          {cycle.status === 'delivered' && (
            <button
              onClick={handleArchive}
              disabled={isPending}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              📁 Архивирай
            </button>
          )}
          {cycle.status === 'upcoming' && (
            <button
              onClick={handleDeleteCycle}
              disabled={isPending}
              className="ml-auto text-red-500 border border-red-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              🗑 Изтрий цикъл
            </button>
          )}
        </div>
      </div>

      {/* Section B: Box Contents */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-brand-navy)]">
            Съдържание на кутията ({items.length})
          </h2>
          <button
            onClick={handleAddItem}
            className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Добави артикул
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">Няма добавени артикули.</p>
            <button
              onClick={handleAddItem}
              className="text-[var(--color-brand-orange)] hover:underline text-sm"
            >
              Добави първия артикул
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors"
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveItem(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs"
                    title="Нагоре"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs"
                    title="Надолу"
                  >
                    ▼
                  </button>
                </div>

                {/* Image thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
                      📦
                    </div>
                  )}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  )}
                </div>

                {/* Category badge */}
                {item.category && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-gray-400 hover:text-[var(--color-brand-orange)] p-1.5 rounded transition-colors"
                    title="Редактирай"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                    title="Изтрий"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Add/Edit Modal */}
      {showItemModal && (
        <ItemModal
          cycleId={cycle.id}
          item={editingItem}
          onSave={handleItemSaved}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmModal
          title={showConfirmModal.title}
          message={showConfirmModal.message}
          onConfirm={showConfirmModal.onConfirm}
          onCancel={() => setShowConfirmModal(null)}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ============================================================================
// Item Modal
// ============================================================================

function ItemModal({
  cycleId,
  item,
  onSave,
  onClose,
}: {
  cycleId: string;
  item: DeliveryCycleItemRow | null;
  onSave: (item: DeliveryCycleItemRow, isNew: boolean) => void;
  onClose: () => void;
}) {
  const isNew = !item;
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Невалиден формат. Позволени: JPG, PNG, WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Файлът е твърде голям. Максимум 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cycleId', cycleId);

      const res = await fetch('/api/admin/delivery/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Грешка при качване.');
        return;
      }

      setImageUrl(data.url);
    } catch {
      setError('Грешка при качване на изображението.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Името е задължително.');
      return;
    }

    setSaving(true);

    try {
      const url = isNew
        ? `/api/admin/delivery/${cycleId}/items`
        : `/api/admin/delivery/${cycleId}/items/${item.id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          image_url: imageUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Грешка при запазване.');
        return;
      }

      onSave(data.item, isNew);
    } catch {
      setError('Грешка при запазване на артикула.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-brand-navy)]">
              {isNew ? 'Добави артикул' : 'Редактирай артикул'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Име <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Име на артикула"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:border-[var(--color-brand-orange)] focus:outline-none"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Описание на артикула"
                className="w-full border rounded-lg px-3 py-2 text-sm resize-y focus:border-[var(--color-brand-orange)] focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:border-[var(--color-brand-orange)] focus:outline-none"
              >
                <option value="">Без категория</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Изображение
              </label>

              {imageUrl && (
                <div className="mb-2 relative inline-block">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleImageUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {uploading && (
                <p className="text-xs text-blue-600 mt-1">Качване...</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG или WebP, максимум 5MB
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="bg-[var(--color-brand-orange)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Запазване...' : isNew ? 'Добави' : 'Запази'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-600 border border-gray-300 px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Отказ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Confirm Modal
// ============================================================================

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Отказ
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Изпълнение...' : 'Потвърди'}
          </button>
        </div>
      </div>
    </div>
  );
}
