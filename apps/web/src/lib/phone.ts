/** Normalisation des numéros (E.164). Burkina Faso : +226 + 8 chiffres. Extensible UEMOA. */
export const DIAL_CODES: Record<string, { dial: string; length: number }> = {
  BF: { dial: '226', length: 8 }, CI: { dial: '225', length: 10 }, SN: { dial: '221', length: 9 },
  ML: { dial: '223', length: 8 }, NE: { dial: '227', length: 8 }, TG: { dial: '228', length: 8 },
  BJ: { dial: '229', length: 8 }, GW: { dial: '245', length: 9 },
};

export function normalizePhone(input: string, country = 'BF'): string | null {
  const rule = DIAL_CODES[country];
  if (!rule) return null;
  let d = input.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith(rule.dial) && d.length === rule.dial.length + rule.length) return '+' + d;
  if (d.length === rule.length) return '+' + rule.dial + d;
  return null;
}

export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return '—';
  return e164.slice(0, 4) + ' •• •• ' + e164.slice(-2);
}
