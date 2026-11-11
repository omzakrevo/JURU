import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { STAFF_ROLES, type AppRole } from '@/lib/roles';

export interface Profile {
  id: string; phone: string | null; email: string | null; full_name: string | null; country_code: string;
  birth_date: string | null; city: string | null; address: string | null; account_type: string;
  business_name: string | null; kyc_status: string; is_borrower: boolean; is_lender: boolean; status: string;
  preferred_locale: string; consent_terms_at: string | null; created_at: string;
}
export interface SessionInfo { userId: string; profile: Profile; roles: AppRole[]; isStaff: boolean }

export async function getSession(): Promise<SessionInfo | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);
  if (!profile) return null;
  const r = (roles ?? []).map((x: { role: AppRole }) => x.role);
  return { userId: user.id, profile: profile as Profile, roles: r, isStaff: r.some((x) => STAFF_ROLES.includes(x)) };
}

export async function requireSession(): Promise<SessionInfo> {
  const s = await getSession();
  if (!s) redirect('/connexion');
  if (s.profile.status !== 'active') redirect('/connexion?error=suspended');
  return s;
}

export async function requireStaff(): Promise<SessionInfo> {
  const s = await requireSession();
  if (!s.isStaff) redirect('/app');
  return s;
}
