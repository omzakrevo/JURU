import Link from 'next/link';
import { DemoBanner } from '@/components/DemoBanner';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured())
    return <div className="container-x py-16"><Alert tone="warning" title="Supabase non configuré">Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir docs/INSTALL.md), puis relancez.</Alert></div>;
  const s = await requireSession();
  const supabase = await createClient();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('channel', 'in_app').is('read_at', null);
  const kyc = s.profile.kyc_status;
  return (
    <>
      <AppShell banner={<DemoBanner compact />} name={s.profile.full_name ?? s.profile.phone ?? 'Mon compte'} unread={count ?? 0} isStaff={s.isStaff}>
        {kyc !== 'approved' && (
          <div className="mb-6"><Alert tone={kyc === 'rejected' ? 'danger' : 'info'} title={kyc === 'pending' ? 'Vérification d’identité en cours' : 'Vérifiez votre identité pour emprunter ou prêter'}>
            {kyc === 'pending' ? 'Nous examinons vos documents.' : <>Le KYC est obligatoire. <Link href="/app/kyc" className="font-semibold underline">Commencer</Link></>}</Alert></div>
        )}
        {children}
      </AppShell>
    </>
  );
}
