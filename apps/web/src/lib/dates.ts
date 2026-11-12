/** Dates stockées en UTC ; présentées dans le fuseau du pays (configurable). */
export const DEFAULT_TZ = 'Africa/Ouagadougou';

export function formatDate(iso: string | Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: tz }).format(new Date(iso));
}
export function formatDateTime(iso: string | Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(iso));
}
/** Date « calendaire » (colonne SQL date) sans décalage de fuseau. */
export function formatCalendarDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Date.UTC(y!, m! - 1, day!)));
}
