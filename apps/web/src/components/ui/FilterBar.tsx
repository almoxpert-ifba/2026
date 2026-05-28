import React, { useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '../../utils';
import { ComboBox } from './ComboBox';

// ─── Tipos públicos ────────────────────────────────────────────────────────────
export interface FilterFieldDef {
  key: string;
  label: string;                                        // label na tag e no placeholder fallback
  type: 'text' | 'select' | 'date' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];        // somente para type === 'select'
}

interface FilterBarProps<T extends object> {
  filters: T;
  defaults: T;                                          // estado "vazio" — usado para reset
  fields: FilterFieldDef[];
  onChange: (next: T) => void;
  defaultOpen?: boolean;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayValue(field: FilterFieldDef, value: string): string {
  if (field.type === 'select') {
    return field.options?.find((o) => o.value === value)?.label ?? value;
  }
  if (field.type === 'date') {
    // YYYY-MM-DD → DD/MM/YYYY
    const [y, m, d] = value.split('-');
    return d && m && y ? `${d}/${m}/${y}` : value;
  }
  return value;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function FilterBar<T extends object>({
  filters,
  defaults,
  fields,
  onChange,
  defaultOpen = false,
  className,
}: FilterBarProps<T>) {
  const [open, setOpen] = useState(defaultOpen);

  const asRecord = (v: T) => v as unknown as Record<string, string>;

  // Apenas campos cujo valor difere do default (e não é string vazia)
  const activeTags = fields.filter(
    (f) => asRecord(filters)[f.key] !== '' && asRecord(filters)[f.key] !== undefined,
  );

  const hasActive = activeTags.length > 0;

  const set = (key: string, value: string) =>
    onChange({ ...asRecord(filters), [key]: value } as unknown as T);

  const remove = (key: string) =>
    onChange({ ...asRecord(filters), [key]: asRecord(defaults)[key] ?? '' } as unknown as T);

  const clearAll = () => onChange({ ...defaults });

  // ── Render de cada campo ────────────────────────────────────────────────────
  const renderField = (field: FilterFieldDef) => {
    const value = asRecord(filters)[field.key] ?? '';

    if (field.type === 'select') {
      return (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{field.label}</label>
          <ComboBox
            placeholder={field.placeholder ?? field.label}
            options={field.options ?? []}
            value={value}
            onChange={(v) => set(field.key, v as string)}
          />
        </div>
      );
    }

    return (
      <div key={field.key} className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{field.label}</label>
        <div className="relative">
          {field.type === 'text' && (
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          )}
          <input
            type={field.type}
            value={value}
            placeholder={field.placeholder ?? `${field.label}...`}
            min={field.type === 'number' ? 1 : undefined}
            onChange={(e) => set(field.key, e.target.value)}
            className={cn('input w-full', field.type === 'text' ? 'pl-9' : undefined)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={cn('border-b border-gray-100', className)}>
      {/* ── Barra de controle ────────────────────────────────────────────── */}
      <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
            open
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
          )}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {hasActive && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeTags.length}
            </span>
          )}
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* ── Tags dos filtros ativos ─────────────────────────────────────── */}
        {hasActive && (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {activeTags.map((field) => (
              <span
                key={field.key}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
              >
                <span className="text-blue-400 font-normal">{field.label}:</span>
                {displayValue(field, asRecord(filters)[field.key])}
                <button
                  type="button"
                  onClick={() => remove(field.key)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors ml-0.5"
                >
                  <X size={9} strokeWidth={2.5} />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 ml-1"
            >
              <X size={11} />
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* ── Painel expansível ────────────────────────────────────────────── */}
      {open && (
        <div className="px-5 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fields.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}
