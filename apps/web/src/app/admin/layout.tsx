import { DemoBanner } from '@/components/DemoBanner';
import { AdminShell } from '@/components/layout/AdminShell';
import { Alert } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { ADMIN_SECTIONS, ROLE_LABELS, canSee } from '@/lib/roles';
import { requireStaff } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <div className="container-x py-16"><Alert tone="warning" title="Supabase non configuré">Voir docs/INSTALL.md.</Alert></div>;
  const s = await requireStaff();
  const sections = [...Object.keys(ADMIN_SECTIONS), 'messages'].filter((k) => k === 'messages' ? s.roles.some((r) => ['super_admin', 'support'].includes(r)) : canSee(s.roles, k));
  return (<><DemoBanner compact /><AdminShell sections={sections} name={s.profile.full_name ?? 'Équipe'} roles={s.roles.map((r) => ROLE_LABELS[r]).join(', ')}>{children}</AdminShell></>);
}
