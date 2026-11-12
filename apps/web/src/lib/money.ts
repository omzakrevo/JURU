/** Montants : FCFA (XOF), toujours des entiers. */
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function formatFcfa(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'string' ? Number(amount) : Number(amount);
  if (!Number.isFinite(n)) return '—';
  // Remplace l'espace insécable fine d'Intl par une espace insécable simple (rendu uniforme)
  return nf.format(Math.round(n)).replace(/[  ]/g, ' ') + ' FCFA';
}

/** Points de base → pourcentage lisible : 1800 → « 18 % ». */
export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return '—';
  const pct = bps / 100;
  return (Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace('.', ',')) + ' %';
}

/** Saisie utilisateur « 150 000 », « 150000 FCFA » → entier ; NaN si invalide. */
export function parseFcfa(input: string): number {
  const digits = input.replace(/[^\d]/g, '');
  return digits === '' ? NaN : parseInt(digits, 10);
}

/** % saisi (« 18 », « 18,5 ») → points de base entiers. */
export function percentToBps(input: string | number): number {
  const n = typeof input === 'number' ? input : parseFloat(input.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
