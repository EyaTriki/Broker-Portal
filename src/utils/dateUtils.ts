/**
 * Calendar-day helpers for `<input type="date">`.
 * We store noon UTC so the chosen day stays stable across timezones when
 * read back with {@link toDateInputValue}.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Turn an API date into `YYYY-MM-DD` for a date input (empty if unset/invalid). */
export function toDateInputValue(value?: string | Date | null): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const match = value.trim().match(DATE_ONLY);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Turn a date-input value into an ISO string, or `null` when blank/invalid.
 * Never falls back to "today".
 */
export function dateInputToIso(value?: string | null): string | null {
  const trimmed = String(value || '').trim();
  if (!DATE_ONLY.test(trimmed)) return null;
  return `${trimmed}T12:00:00.000Z`;
}
