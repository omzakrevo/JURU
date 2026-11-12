'use server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { parseRpcError } from '@/lib/errors';
import { rateLimit } from '@/lib/ratelimit';
import { str, type ActionState } from '@/lib/actions';

export async function sendContact(_: ActionState, fd: FormData): Promise<ActionState> {
  if (str(fd, 'website')) return { ok: true, message: 'Merci, votre message a été envoyé.' }; // champ piège (honeypot) pour les robots
  if (!isSupabaseConfigured()) return { error: 'Le serveur n’est pas configuré. Écrivez-nous directement par e-mail.' };
  if (!(await rateLimit('contact', 3, 15 * 60_000))) return { error: 'Trop de messages envoyés. Réessayez plus tard.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_contact_message', {
    p_name: str(fd, 'name'), p_email: str(fd, 'email'), p_phone: str(fd, 'phone'),
    p_subject: str(fd, 'subject'), p_message: str(fd, 'message'),
  });
  if (error) {
    const e = parseRpcError(error);
    return { error: e.code === 'UNKNOWN' ? 'Veuillez compléter le formulaire (nom, sujet, message de 10 caractères minimum, e-mail ou téléphone).' : e.message };
  }
  return { ok: true, message: 'Merci, votre message a été envoyé. Nous vous répondrons rapidement.' };
}
