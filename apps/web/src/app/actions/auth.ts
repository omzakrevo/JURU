'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { normalizePhone } from '@/lib/phone';
import { rateLimit } from '@/lib/ratelimit';
import { bool, str, type ActionState } from '@/lib/actions';

const NOT_CONFIGURED = 'Le serveur Supabase n’est pas configuré (voir docs/INSTALL.md).';

/** Étape 1 : envoie un code OTP par SMS. shouldCreateUser = true uniquement à l'inscription. */
export async function sendOtp(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const mode = str(fd, 'mode') === 'signup' ? 'signup' : 'login';
  const phone = normalizePhone(str(fd, 'phone'), 'BF');
  if (!phone) return { error: 'Numéro invalide. Exemple : 70 12 34 56 (Burkina Faso).' };
  if (mode === 'signup' && !(bool(fd, 'terms') && bool(fd, 'privacy')))
    return { error: 'Veuillez accepter les conditions d’utilisation et la politique de confidentialité.' };
  // 5 envois / 10 min par IP et 3 / 10 min par numéro : anti-abus (coût SMS, énumération)
  if (!(await rateLimit('otp-ip', 5, 10 * 60_000)) || !(await rateLimit('otp-phone', 3, 10 * 60_000, phone)))
    return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: mode === 'signup', data: mode === 'signup' ? { full_name: str(fd, 'full_name'), country_code: 'BF' } : undefined },
  });
  if (error) {
    // Message volontairement générique : on ne révèle pas si un numéro est inscrit
    return { error: 'Impossible d’envoyer le code. Vérifiez le numéro (ou, si vous n’avez pas de compte, inscrivez-vous).' };
  }
  redirect(`/verification?phone=${encodeURIComponent(phone)}&mode=${mode}`);
}

/** Étape 2 : vérifie le code OTP et ouvre la session. */
export async function verifyOtp(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const phone = normalizePhone(str(fd, 'phone'), 'BF');
  const token = str(fd, 'token').replace(/\s/g, '');
  if (!phone || !/^\d{4,8}$/.test(token)) return { error: 'Code invalide.' };
  if (!(await rateLimit('otp-verify', 8, 10 * 60_000, phone))) return { error: 'Trop d’essais. Réessayez dans quelques minutes.' };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error || !data.user) return { error: 'Code incorrect ou expiré.' };
  if (str(fd, 'mode') === 'signup') {
    await supabase.from('profiles').update({ consent_terms_at: new Date().toISOString(), consent_privacy_at: new Date().toISOString() }).eq('id', data.user.id);
    redirect('/app/profil?bienvenue=1');
  }
  const next = str(fd, 'next');
  redirect(next.startsWith('/app') || next.startsWith('/admin') ? next : '/app');
}

/** Connexion du personnel (e-mail + mot de passe). Les comptes staff sont créés par un super administrateur. */
export async function signInStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  if (!(await rateLimit('staff-login', 8, 10 * 60_000))) return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd, 'email'), password: str(fd, 'password') });
  if (error) return { error: 'Identifiants incorrects.' };
  redirect('/admin');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
