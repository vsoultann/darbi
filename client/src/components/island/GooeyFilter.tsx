/**
 * The gooey blob filter (§6.3.8).
 *
 * A blur followed by a very steep alpha contrast curve: anything that is *nearly*
 * opaque snaps to fully opaque, so two black shapes passing near each other fuse like
 * liquid. Mounted once, referenced by `.darbi-goo { filter: url(#darbi-goo) }`.
 *
 * `prefers-reduced-motion` (or the Settings toggle) removes the class — see globals.css —
 * which drops the filter and leaves a plain 150 ms fade behind.
 */
export function GooeyFilter() {
  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0" focusable="false">
      <defs>
        <filter id="darbi-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 26 -12"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
  );
}
