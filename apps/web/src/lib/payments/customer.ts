/** Informations client exigées par SAS Pay (e-mail, prénom, nom) à partir du profil. */
export function buildCustomer(p: { email: string | null; full_name: string | null }, fallbackEmail = process.env.SASPAY_FALLBACK_EMAIL) {
  const email = p.email || fallbackEmail || '';
  if (!email) return null;
  const parts = (p.full_name ?? '').trim().split(/\s+/).filter(Boolean);
  return { email, firstName: parts[0] ?? 'Client', lastName: parts.slice(1).join(' ') || 'JURU' };
}
