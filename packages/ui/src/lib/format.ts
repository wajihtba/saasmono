// The app renders in Arabic (dir="rtl"), but numbers must stay in Latin
// digits — an `ar` browser locale would otherwise turn 1,234 into ١,٢٣٤.
// Pinning the locale here keeps every number identical across browsers.
const NUMBER_LOCALE = "en-US";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, options).format(value);
}

/** Takes a whole percentage (8.2 → "8.2%"), not a fraction. */
export function formatPercent(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return `${formatNumber(value, { maximumFractionDigits: 1, ...options })}%`;
}

/** Same as `formatPercent` but always carries a sign: 8.2 → "+8.2%". */
export function formatDelta(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return formatPercent(value, { signDisplay: "always", ...options });
}
