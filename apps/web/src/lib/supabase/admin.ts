import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/env';

/**
 * Client SERVICE_ROLE : contourne la RLS. À n'utiliser QUE dans du code serveur de confiance (worker de paiement,
 * enregistrement des réponses du fournisseur). Jamais exposé au navigateur ; la clé n'est jamais préfixée NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante (serveur uniquement)');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
