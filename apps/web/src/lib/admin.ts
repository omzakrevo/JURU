import 'server-only';
import { notFound } from 'next/navigation';
import { canSee } from '@/lib/roles';
import { requireStaff } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

/** Garde de page : le rôle doit voir la section (l'autorisation réelle reste appliquée par RLS/RPC). */
export async function adminPage(section: string) {
  const s = await requireStaff();
  if (!canSee(s.roles, section) && !(section === 'messages' && s.roles.includes('super_admin'))) notFound();
  return { s, supabase: await createClient() };
}
