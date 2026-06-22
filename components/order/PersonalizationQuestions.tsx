'use client';

/**
 * Reusable, fully-controlled personalization question blocks.
 *
 * These presentational components are shared by the simplified order page
 * (`/order`) and the post-subscription personalization step on the thank-you
 * page. Each block is stateless — the parent owns the values and handlers.
 */

import type { CatalogOption, ColorOption } from '@/lib/catalog';

const cardBase =
  'bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md cursor-pointer transition-all border-3';
const cardSelected =
  'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2';
const cardIdle = 'border-transparent hover:shadow-lg hover:-translate-y-0.5';

const questionTitle =
  'text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 md:mb-10';

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-3 flex-shrink-0 flex items-center justify-center ${
        checked ? 'border-[var(--color-brand-orange)] bg-[var(--color-brand-orange)]' : 'border-gray-300'
      }`}
    >
      {checked && <div className="text-white text-xs sm:text-sm font-bold">✓</div>}
    </div>
  );
}

function OtherInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  invalid: boolean;
}) {
  return (
    <div className="mt-3 sm:mt-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl focus:outline-none text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base ${
          invalid
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-300 focus:border-[var(--color-brand-orange)]'
        }`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------
interface SizeQuestionProps {
  sizes: CatalogOption[];
  sizeUpper: string;
  sizeLower: string;
  onSelectUpper: (id: string) => void;
  onSelectLower: (id: string) => void;
}

export function SizeQuestion({ sizes, sizeUpper, sizeLower, onSelectUpper, onSelectLower }: SizeQuestionProps) {
  if (sizes.length === 0) return null;
  const sizeButton = (active: boolean) =>
    `px-4 sm:px-5 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all ${
      active
        ? 'bg-[var(--color-brand-orange)] text-white'
        : 'bg-gray-100 text-[var(--color-brand-navy)] hover:bg-gray-200'
    }`;
  return (
    <div>
      <h2 className={questionTitle}>Какъв размер спортни дрехи носиш?</h2>
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-md">
          <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)] mb-3 sm:mb-4">Горна част:</div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {sizes.map((size) => (
              <button key={size.id} type="button" onClick={() => onSelectUpper(size.id)} className={sizeButton(sizeUpper === size.id)}>
                {size.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-md">
          <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)] mb-3 sm:mb-4">Долна част:</div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {sizes.map((size) => (
              <button key={size.id} type="button" onClick={() => onSelectLower(size.id)} className={sizeButton(sizeLower === size.id)}>
                {size.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dietary
// ---------------------------------------------------------------------------
interface DietaryQuestionProps {
  options: CatalogOption[];
  dietary: string[];
  dietaryOther: string;
  onToggle: (id: string) => void;
  onChangeOther: (val: string) => void;
}

export function DietaryQuestion({ options, dietary, dietaryOther, onToggle, onChangeOther }: DietaryQuestionProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <h2 className={questionTitle}>Имаш ли хранителни ограничения?</h2>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {options.map((item) => (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`${cardBase} ${dietary.includes(item.id) ? cardSelected : cardIdle}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Checkbox checked={dietary.includes(item.id)} />
              <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
      {dietary.includes('other') && (
        <OtherInput value={dietaryOther} onChange={onChangeOther} placeholder="Какво ограничение?" invalid={!dietaryOther.trim()} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sports
// ---------------------------------------------------------------------------
interface SportsQuestionProps {
  options: CatalogOption[];
  sports: string[];
  sportOther: string;
  onToggle: (id: string) => void;
  onChangeOther: (val: string) => void;
}

export function SportsQuestion({ options, sports, sportOther, onToggle, onChangeOther }: SportsQuestionProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <h2 className={questionTitle}>Какъв спорт практикуваш?</h2>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {options.map((sport) => (
          <div
            key={sport.id}
            onClick={() => onToggle(sport.id)}
            className={`${cardBase} ${sports.includes(sport.id) ? cardSelected : cardIdle}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Checkbox checked={sports.includes(sport.id)} />
              <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">{sport.label}</div>
            </div>
          </div>
        ))}
      </div>
      {sports.includes('other') && (
        <OtherInput value={sportOther} onChange={onChangeOther} placeholder="Кой спорт?" invalid={!sportOther.trim()} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
interface ColorsQuestionProps {
  options: ColorOption[];
  colors: string[];
  onToggle: (hex: string) => void;
}

export function ColorsQuestion({ options, colors, onToggle }: ColorsQuestionProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <h2 className={questionTitle}>Какви цветове обичаш да носиш?</h2>
      <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {options.map((color) => (
          <div
            key={color.id}
            onClick={() => onToggle(color.hex)}
            title={color.label}
            className={`aspect-square rounded-lg sm:rounded-xl cursor-pointer transition-all shadow-md hover:scale-105 ${
              colors.includes(color.hex) ? 'ring-2 sm:ring-4 ring-[var(--color-brand-orange)] ring-offset-1 sm:ring-offset-2' : ''
            } ${color.hex === '#FFFFFF' ? 'border-2 border-gray-300' : ''} ${
              color.hex === '#FB7D00' && colors.includes(color.hex) ? 'ring-[var(--color-brand-navy)]' : ''
            }`}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flavors
// ---------------------------------------------------------------------------
interface FlavorsQuestionProps {
  options: CatalogOption[];
  flavors: string[];
  flavorOther: string;
  onToggle: (id: string) => void;
  onChangeOther: (val: string) => void;
}

export function FlavorsQuestion({ options, flavors, flavorOther, onToggle, onChangeOther }: FlavorsQuestionProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <h2 className={questionTitle}>Кои вкусове ти допадат?</h2>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {options.map((flavor) => (
          <div
            key={flavor.id}
            onClick={() => onToggle(flavor.id)}
            className={`${cardBase} ${flavors.includes(flavor.id) ? cardSelected : cardIdle}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Checkbox checked={flavors.includes(flavor.id)} />
              <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">{flavor.label}</div>
            </div>
          </div>
        ))}
      </div>
      {flavors.includes('other') && (
        <OtherInput value={flavorOther} onChange={onChangeOther} placeholder="Кой вкус?" invalid={!flavorOther.trim()} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
interface NotesQuestionProps {
  notes: string;
  onChange: (val: string) => void;
}

export function NotesQuestion({ notes, onChange }: NotesQuestionProps) {
  return (
    <div>
      <h2 className={questionTitle}>Нещо друго, което да знаем?</h2>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="Допълнителни бележки (по желание)..."
        className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:border-[var(--color-brand-orange)] text-[var(--color-brand-navy)] placeholder:text-gray-400 text-sm sm:text-base"
      />
    </div>
  );
}
