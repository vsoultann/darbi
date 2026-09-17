/** Small form primitives shared by Settings, the admin console and the driver view. */
import type { ReactNode } from 'react';

export function Switch({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2.5" htmlFor={id}>
      <span className="min-w-0">
        <span className="block text-sm font-medium" style={{ color: 'var(--heading)' }}>
          {label}
        </span>
        {hint ? <span className="mt-0.5 block text-xs opacity-70">{hint}</span> : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-darbi-bronze' : 'bg-darbi-dune dark:bg-darbi-cocoa/40'
        }`}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ insetInlineStart: checked ? 'calc(100% - 1.375rem)' : '0.125rem' }}
        />
      </button>
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-xl border p-1"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-lg font-medium transition ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
              active ? 'bg-darbi-bronze text-white shadow-sm' : 'opacity-75 hover:opacity-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="py-2.5">
      <span className="darbi-label">{label}</span>
      {children}
      {hint ? <p className="mt-1.5 text-xs opacity-70">{hint}</p> : null}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-darbi-dune accent-darbi-bronze dark:bg-darbi-cocoa/40"
    />
  );
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="darbi-card p-4 sm:p-5">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg" style={{ color: 'var(--heading)' }}>
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs opacity-70">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
