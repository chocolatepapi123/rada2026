import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Plus, X } from 'lucide-react';

export type RadaPickerAccent = 'terracotta' | 'purple';

const ACCENT_STYLE: Record<
  RadaPickerAccent,
  {
    openBorder: string;
    activeRow: string;
    iconText: string;
    selectedBg: string;
    todayRing: string;
    pillActive: string;
  }
> = {
  terracotta: {
    openBorder: 'border-[#E0533C] ring-2 ring-[#E0533C]/20',
    activeRow: 'bg-[#E0533C]/10 text-[#E0533C] font-extrabold',
    iconText: 'text-[#E0533C]',
    selectedBg: 'bg-[#E0533C] text-white shadow-sm shadow-[#E0533C]/30',
    todayRing: 'ring-1 ring-[#E0533C]/50 text-[#E0533C]',
    pillActive: 'bg-[#E0533C] text-white',
  },
  purple: {
    openBorder: 'border-purple-600 ring-2 ring-purple-600/20',
    activeRow: 'bg-purple-600/10 text-purple-600 dark:text-purple-400 font-extrabold',
    iconText: 'text-purple-600 dark:text-purple-400',
    selectedBg: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30',
    todayRing: 'ring-1 ring-purple-600/50 text-purple-600 dark:text-purple-400',
    pillActive: 'bg-purple-600 text-white',
  },
};

function useDismissiblePopover(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, ref]);
}

// ---------------------------------------------------------------------------
// RadaSelect — matches OutingsTab's floating rounded-2xl category selector
// ---------------------------------------------------------------------------
export interface RadaSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface RadaSelectProps {
  value: string;
  options: RadaSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  accent?: RadaPickerAccent;
  compact?: boolean;
  align?: 'left' | 'right';
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export const RadaSelect: React.FC<RadaSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  icon,
  accent = 'terracotta',
  compact = false,
  align = 'left',
  ariaLabel,
  className = '',
  buttonClassName = '',
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(open, () => setOpen(false), wrapRef);

  const selected = options.find((o) => o.value === value);
  const st = ACCENT_STYLE[accent];
  const triggerIcon = selected?.icon ?? icon;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#121113] border rounded-2xl text-left text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer transition ${
          compact ? 'px-3 py-2 text-xs font-extrabold' : 'px-3.5 py-2.5 text-xs sm:text-[13px] font-bold'
        } ${open ? st.openBorder : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'} ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {triggerIcon && <span className={`shrink-0 ${st.iconText}`}>{triggerIcon}</span>}
          <span className={`block truncate ${selected ? '' : 'text-slate-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            compact ? 'min-w-[11rem]' : 'right-0'
          } top-full mt-1.5 z-[90] max-h-72 overflow-y-auto p-1.5 bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-black/15 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? st.activeRow
                      : 'font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// RadaDatePicker — custom calendar dropdown matching Outings aesthetic
// ---------------------------------------------------------------------------
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function localTodayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd?: string): { y: number; m: number; d: number } | null {
  if (!ymd) return null;
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m: m - 1, d };
}

function formatYmd(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplayDate(ymd?: string): string {
  const p = parseYmd(ymd);
  if (!p) return '';
  const dt = new Date(p.y, p.m, p.d);
  const wdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${wdays[dt.getDay()]}, ${MONTH_SHORT[p.m]} ${p.d}, ${p.y}`;
}

interface RadaDatePickerProps {
  value: string;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  accent?: RadaPickerAccent;
  allowClear?: boolean;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
}

export const RadaDatePicker: React.FC<RadaDatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  accent = 'terracotta',
  allowClear = false,
  ariaLabel = 'Choose date',
  className = '',
  buttonClassName = '',
  align = 'left',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(open, () => setOpen(false), wrapRef);

  const today = useMemo(() => localTodayYmd(), []);
  const parsedValue = parseYmd(value);
  const initialDate = parsedValue || parseYmd(today)!;
  const [viewYear, setViewYear] = useState(initialDate.y);
  const [viewMonth, setViewMonth] = useState(initialDate.m);

  useEffect(() => {
    if (open) {
      const p = parseYmd(value) || parseYmd(localTodayYmd())!;
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [open, value]);

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDow, daysInMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const st = ACCENT_STYLE[accent];
  const display = formatDisplayDate(value);
  const canPickToday = (!min || today >= min) && (!max || today <= max);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#121113] border rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] font-bold text-left text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer transition ${
          open ? st.openBorder : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <Calendar className={`w-3.5 h-3.5 shrink-0 ${st.iconText}`} />
          <span className={`block truncate ${display ? '' : 'text-slate-400'}`}>
            {display || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-[90] w-[276px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-black/15 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 text-center">
            {DOW.map((d) => (
              <span key={d} className="text-[10px] font-black uppercase text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <span key={`e-${idx}`} />;
              const cellYmd = formatYmd(viewYear, viewMonth, day);
              const disabled = Boolean((min && cellYmd < min) || (max && cellYmd > max));
              const isSelected = cellYmd === value;
              const isToday = cellYmd === today;
              return (
                <button
                  key={cellYmd}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(cellYmd);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center transition ${
                    disabled
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : isSelected
                      ? `${st.selectedBg} font-black cursor-pointer`
                      : isToday
                      ? `${st.todayRing} font-black hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer`
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {(canPickToday || (allowClear && value)) && (
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
              {canPickToday ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(today);
                    setOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06] ${st.iconText}`}
                >
                  Today
                </button>
              ) : (
                <span />
              )}
              {allowClear && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// RadaTimePicker — custom AM/PM + Hour + Minute picker matching Outings vibe
// ---------------------------------------------------------------------------
function format12h(hhmm?: string): string {
  if (!hhmm || !hhmm.includes(':')) return '';
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return '';
  const ampm = hRaw >= 12 ? 'PM' : 'AM';
  const h12 = hRaw % 12 || 12;
  return `${h12}:${String(mRaw).padStart(2, '0')} ${ampm}`;
}

function parseTime24(hhmm?: string): { h12: number; min: number; ampm: 'AM' | 'PM' } {
  if (!hhmm || !hhmm.includes(':')) return { h12: 6, min: 0, ampm: 'PM' };
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return { h12: 6, min: 0, ampm: 'PM' };
  return {
    h12: hRaw % 12 || 12,
    min: mRaw,
    ampm: hRaw >= 12 ? 'PM' : 'AM',
  };
}

function toTime24(h12: number, min: number, ampm: 'AM' | 'PM'): string {
  let h24 = h12 % 12;
  if (ampm === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_STEP = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface RadaTimePickerProps {
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
  accent?: RadaPickerAccent;
  allowClear?: boolean;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
}

export const RadaTimePicker: React.FC<RadaTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select time',
  accent = 'terracotta',
  allowClear = false,
  ariaLabel = 'Choose time',
  className = '',
  buttonClassName = '',
  align = 'left',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(open, () => setOpen(false), wrapRef);

  const st = ACCENT_STYLE[accent];
  const parsed = parseTime24(value);
  const display = format12h(value);

  const setPart = (next: Partial<{ h12: number; min: number; ampm: 'AM' | 'PM' }>) => {
    const cur = parseTime24(value);
    const merged = { ...cur, ...next };
    onChange(toTime24(merged.h12, merged.min, merged.ampm));
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#121113] border rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] font-bold text-left text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer transition ${
          open ? st.openBorder : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className={`w-3.5 h-3.5 shrink-0 ${st.iconText}`} />
          <span className={`block truncate ${display ? '' : 'text-slate-400'}`}>
            {display || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-[90] w-[256px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-black/15 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* AM / PM switch */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl">
            {(['AM', 'PM'] as const).map((ap) => {
              const active = Boolean(value) && parsed.ampm === ap;
              return (
                <button
                  key={ap}
                  type="button"
                  onClick={() => setPart({ ampm: ap })}
                  className={`py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
                    active ? st.pillActive : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {ap}
                </button>
              );
            })}
          </div>

          {/* Hour & Minute columns */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1">Hour</p>
              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5">
                {HOURS_12.map((h) => {
                  const active = Boolean(value) && parsed.h12 === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setPart({ h12: h })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                        active
                          ? st.activeRow
                          : 'font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{h}</span>
                      {active && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1">Min</p>
              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5">
                {MINUTES_STEP.map((m) => {
                  const active = Boolean(value) && parsed.min === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPart({ min: m })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                        active
                          ? st.activeRow
                          : 'font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{String(m).padStart(2, '0')}</span>
                      {active && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
            {allowClear && value ? (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 px-1">{display || 'Pick time'}</span>
            )}
            <button
              type="button"
              onClick={() => {
                if (!value) onChange(toTime24(parsed.h12, parsed.min, parsed.ampm));
                setOpen(false);
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-black cursor-pointer ${st.pillActive}`}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// RadaAreaCombobox — custom area filter replacing native <datalist>
// ---------------------------------------------------------------------------
interface RadaAreaComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  accent?: RadaPickerAccent;
}

export const RadaAreaCombobox: React.FC<RadaAreaComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Filter area (e.g. Ruiru, Karen, Kilimani)...',
  accent = 'terracotta',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(open, () => setOpen(false), wrapRef);
  const st = ACCENT_STYLE[accent];

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = options.filter(Boolean);
    if (!q) return list.slice(0, 12);
    return list.filter((o) => o.toLowerCase().includes(q)).slice(0, 12);
  }, [options, value]);

  const showCustom =
    value.trim().length > 0 && !matches.some((m) => m.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={wrapRef} className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MapPin className={`w-3.5 h-3.5 ${st.iconText}`} />
      </div>
      <input
        type="text"
        aria-label="Filter area or neighborhood"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className={`w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-black/40 border rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 transition ${
          open ? st.openBorder : 'border-slate-200 dark:border-slate-800'
        }`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
          title="Clear area filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <ChevronDown
          className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      )}

      {open && (matches.length > 0 || showCustom) && (
        <ul
          role="listbox"
          aria-label="Areas"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-64 overflow-y-auto p-1.5 bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-lg shadow-black/10"
        >
          {showCustom && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(value.trim());
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition ${st.activeRow}`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Filter "{value.trim()}"</span>
                </span>
              </button>
            </li>
          )}
          {matches.map((loc) => {
            const active = value.trim().toLowerCase() === loc.toLowerCase();
            return (
              <li key={loc} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(loc);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition ${
                    active
                      ? st.activeRow
                      : 'font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="truncate">{loc}</span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
