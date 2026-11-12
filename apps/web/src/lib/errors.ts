/** Les RPC SQL lèvent « CODE: message en français ». On extrait le code et un message affichable. */
export interface AppError { code: string; message: string }

const FALLBACKS: Record<string, string> = {
  AUTH_REQUIRED: 'Veuillez vous connecter.',
  FORBIDDEN: 'Vous n’avez pas les droits nécessaires.',
  KYC_REQUIRED: 'Votre identité doit d’abord être vérifiée.',
  ACCOUNT_SUSPENDED: 'Votre compte est suspendu. Contactez le support.',
  SELF_APPROVAL_FORBIDDEN: 'Double validation : un autre responsable doit valider cette opération.',
};

export function parseRpcError(err: { message?: string; code?: string } | null | undefined): AppError {
  const raw = err?.message ?? 'Erreur inconnue';
  const m = raw.match(/^([A-Z][A-Z0-9_]{2,}):\s*(.*)$/s);
  if (m) return { code: m[1]!, message: m[2] || FALLBACKS[m[1]!] || raw };
  if (err?.code === '42501' || /row-level security|permission denied/i.test(raw))
    return { code: 'FORBIDDEN', message: FALLBACKS.FORBIDDEN! };
  if (/JWT|not authenticated/i.test(raw)) return { code: 'AUTH_REQUIRED', message: FALLBACKS.AUTH_REQUIRED! };
  return { code: 'UNKNOWN', message: raw };
}
