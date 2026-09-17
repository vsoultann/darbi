/** The brand lockup: serif "Darbi", the Arabic wordmark, and the letterspaced tagline. */
export function Logo({ size = 'md', stacked = true }: { size?: 'sm' | 'md' | 'lg'; stacked?: boolean }) {
  const scale = size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-xl' : 'text-3xl';
  return (
    <div className={stacked ? 'text-center' : 'flex items-baseline gap-3'}>
      <div className="flex items-baseline justify-center gap-2.5">
        <span className={`font-display font-semibold leading-none ${scale}`} style={{ color: 'var(--heading)' }}>
          Darbi
        </span>
        <span
          className={`font-arabic leading-none ${size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'}`}
          style={{ color: 'var(--darbi-bronze)' }}
          dir="rtl"
        >
          دربي
        </span>
      </div>
      {stacked ? (
        <p
          className="mt-1.5 text-[10px] font-semibold uppercase"
          style={{ letterSpacing: '0.42em', color: 'var(--darbi-gold)' }}
        >
          My Path
        </p>
      ) : null}
    </div>
  );
}
