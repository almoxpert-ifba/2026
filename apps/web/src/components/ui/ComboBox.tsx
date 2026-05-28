import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { X, Check, Loader2, ChevronsUpDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComboBoxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboBoxFetchParams {
  search:    string;
  pageIndex: number;
  pageSize:  number;
}

export interface ComboBoxFetchResult {
  data:  ComboBoxOption[];
  total: number;
}

interface ComboBoxBaseProps {
  label?:          string;
  placeholder?:    string;
  error?:          string;
  hint?:           string;
  disabled?:       boolean;
  clearable?:      boolean;
  searchable?:     boolean;
  maxHeight?:      number;
  className?:      string;
  queryKey?:       string;
  fetchFn?:        (params: ComboBoxFetchParams) => Promise<ComboBoxFetchResult>;
  pageSize?:       number;
  options?:        ComboBoxOption[];
  initialOptions?: ComboBoxOption[];
}

interface SingleProps extends ComboBoxBaseProps {
  multiple?: false;
  value:     string;
  onChange:  (value: string, option?: ComboBoxOption) => void;
}

interface MultiProps extends ComboBoxBaseProps {
  multiple:  true;
  value:     string[];
  onChange:  (values: string[], options: ComboBoxOption[]) => void;
}

export type ComboBoxProps = SingleProps | MultiProps;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

function useDebounce(value: string, ms = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ComboBox: React.FC<ComboBoxProps> = (props) => {
  const {
    label, placeholder = 'Selecione...', error, hint,
    disabled = false, clearable = true,
    maxHeight = 200, className = '',
    queryKey = 'combobox',
    fetchFn, pageSize = 5,
    options: staticOptions,
    initialOptions,
    multiple,
  } = props;

  const uid         = useId();
  const [isOpen, setIsOpen]     = useState(false);
  const [search, setSearch]     = useState('');
  const debounced               = useDebounce(search);
  const containerRef            = useRef<HTMLDivElement>(null);
  const dropdownRef             = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const sentinelRef             = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // searchable auto: true when async or static list has more than 5 options
  const searchable = props.searchable ??
    (!!fetchFn || (staticOptions ? staticOptions.length > 5 : false));

  // ── Normalize value ─────────────────────────────────────────────────────────
  const selectedValues: string[] = multiple
    ? (props.value as string[]) ?? []
    : props.value ? [props.value as string] : [];

  // ── Async mode ──────────────────────────────────────────────────────────────
  const asyncQuery = useInfiniteQuery({
    queryKey:         [queryKey, debounced],
    queryFn:          ({ pageParam }) =>
      fetchFn!({ search: debounced, pageIndex: pageParam as number, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((s, p) => s + p.data.length, 0);
      return loaded < last.total ? all.length : undefined;
    },
    enabled: isOpen && !!fetchFn,
    staleTime: 60_000,
  });

  const asyncItems = asyncQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const asyncTotal = asyncQuery.data?.pages[0]?.total ?? 0;
  const isFetching = asyncQuery.isFetching && !asyncQuery.isFetchingNextPage;

  // ── Static mode ─────────────────────────────────────────────────────────────
  const filteredStatic = staticOptions
    ? (searchable && search
        ? staticOptions.filter((o) =>
            o.label.toLowerCase().includes(search.toLowerCase()))
        : staticOptions)
    : [];

  const visibleOptions: ComboBoxOption[] = fetchFn ? asyncItems : filteredStatic;

  // Merge initialOptions so pre-selected items always have a display label
  const allKnownOptions: ComboBoxOption[] = [
    ...(initialOptions ?? []),
    ...visibleOptions,
  ].filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

  const getLabel = (v: string) =>
    allKnownOptions.find((o) => o.value === v)?.label ?? v;

  // ── Infinite scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !isOpen || !fetchFn) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && asyncQuery.hasNextPage && !asyncQuery.isFetchingNextPage)
          asyncQuery.fetchNextPage();
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isOpen, asyncQuery.hasNextPage, asyncQuery.isFetchingNextPage,
      asyncQuery.fetchNextPage, asyncItems.length, fetchFn]);

  // ── Portal dropdown position ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const update = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top:   rect.bottom + 4,
        left:  rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown  = dropdownRef.current?.contains(target);
      if (!insideContainer && !insideDropdown) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Escape key ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) { setIsOpen(false); setSearch(''); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const open = () => {
    setIsOpen(true);
    setSearch('');
  };

  const selectOption = (opt: ComboBoxOption) => {
    if (opt.disabled) return;
    if (multiple) {
      const next = selectedValues.includes(opt.value)
        ? selectedValues.filter((v) => v !== opt.value)
        : [...selectedValues, opt.value];
      const nextOpts = next.map((v) => allKnownOptions.find((o) => o.value === v)!).filter(Boolean);
      (props as MultiProps).onChange(next, nextOpts);
    } else {
      (props as SingleProps).onChange(opt.value, opt);
      setIsOpen(false);
      setSearch('');
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      (props as MultiProps).onChange([], []);
    } else {
      (props as SingleProps).onChange('', undefined);
    }
    setSearch('');
  };

  const removeChip = (v: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!multiple) return;
    const next = selectedValues.filter((x) => x !== v);
    const nextOpts = next.map((x) => allKnownOptions.find((o) => o.value === x)!).filter(Boolean);
    (props as MultiProps).onChange(next, nextOpts);
  };

  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!multiple) return;
    const all = visibleOptions.filter((o) => !o.disabled).map((o) => o.value);
    const allOpts = all.map((v) => allKnownOptions.find((o) => o.value === v)!).filter(Boolean);
    (props as MultiProps).onChange(all, allOpts);
  };

  const hasValue = selectedValues.length > 0;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const triggerCls = [
    'w-full min-h-[42px] px-3 py-1.5 flex items-center gap-2 rounded-xl border text-sm transition-colors',
    disabled
      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
      : error
      ? 'border-red-400 bg-red-50'
      : isOpen
      ? 'border-blue-400 ring-2 ring-blue-100 bg-white'
      : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer',
    className,
  ].join(' ');

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label htmlFor={uid} className="label">{label}</label>
      )}

      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <div
        className={triggerCls}
        onClick={() => !disabled && !isOpen && inputRef.current?.focus()}
      >
        {/* Multiselect chips (1-2 items) */}
        {multiple && selectedValues.length > 0 && selectedValues.length <= 2 && (
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            {selectedValues.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium"
              >
                <span className="truncate max-w-[100px]">{getLabel(v)}</span>
                <span
                  role="button"
                  onClick={(e) => removeChip(v, e)}
                  className="cursor-pointer text-blue-500 hover:text-blue-800 flex-shrink-0"
                >
                  <X size={10} />
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Multiselect badge (3+ items) */}
        {multiple && selectedValues.length > 2 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold flex-shrink-0">
            {selectedValues.length} selecionados
          </span>
        )}

        {/* Input: search when open, display label when closed */}
        <input
          ref={inputRef}
          id={uid}
          type="text"
          value={isOpen ? search : (!multiple && hasValue ? getLabel(selectedValues[0]) : '')}
          onChange={(e) => { if (searchable) setSearch(e.target.value); }}
          onFocus={() => { if (!isOpen && !disabled) open(); }}
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) {
              setIsOpen(false);
              setSearch('');
            }
          }}
          placeholder={isOpen && searchable ? 'Buscar...' : (hasValue && !multiple ? '' : placeholder)}
          disabled={disabled}
          readOnly={!searchable}
          autoComplete="off"
          className={[
            'flex-1 min-w-0 bg-transparent outline-none text-sm',
            !isOpen && hasValue && !multiple ? 'text-gray-900' : 'text-gray-500 placeholder-gray-400',
            disabled ? 'cursor-not-allowed' : !searchable ? 'cursor-pointer' : '',
          ].join(' ')}
          style={multiple ? { minWidth: '60px' } : undefined}
        />

        {/* Right icons */}
        <span className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {hasValue && clearable && !disabled && (
            <span
              role="button"
              aria-label="Limpar"
              onClick={clearAll}
              className="p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X size={13} />
            </span>
          )}
          {isFetching
            ? <Loader2 size={14} className="text-blue-500 animate-spin" />
            : <ChevronsUpDown size={14} className="text-gray-400" />
          }
        </span>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}

      {/* ── Dropdown (portal — evita clipping por overflow do pai) ─────── */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          style={dropdownStyle}
          className="min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {/* Multiselect actions */}
          {multiple && visibleOptions.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Selecionar todos
              </button>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Limpar ({selectedValues.length})
                </button>
              )}
            </div>
          )}

          {/* Options list */}
          <div style={{ maxHeight }} className="overflow-y-auto overscroll-contain">
            {visibleOptions.length === 0 && !isFetching ? (
              <p className="text-center text-xs text-gray-400 py-5">
                {search ? `Sem resultados para "${search}"` : 'Nenhuma opção disponível.'}
              </p>
            ) : (
              <>
                {visibleOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => selectOption(opt)}
                      className={[
                        'w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5',
                        'border-b border-gray-50 last:border-0 transition-colors',
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed text-gray-400'
                          : isSelected
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      {multiple && (
                        <span className={[
                          'w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors',
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300',
                        ].join(' ')}>
                          {isSelected && <Check size={10} className="text-white" />}
                        </span>
                      )}
                      {!multiple && isSelected && (
                        <Check size={14} className="text-blue-600 flex-shrink-0" />
                      )}
                      {!multiple && !isSelected && (
                        <span className="w-[14px] flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{opt.label}</span>
                    </button>
                  );
                })}

                {/* Infinite scroll sentinel */}
                {fetchFn && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-1.5">
                    {asyncQuery.isFetchingNextPage && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Loader2 size={12} className="animate-spin" />
                        Carregando mais...
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer count */}
          {fetchFn && !isFetching && asyncItems.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {asyncItems.length} de {asyncTotal}
              </span>
              {multiple && selectedValues.length > 0 && (
                <span className="text-[10px] text-blue-600 font-medium">
                  {selectedValues.length} selecionado(s)
                </span>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};
