import { redirect } from 'next/navigation';
import { KycWizard } from '@/components/KycWizard';
import { requireSession } from '@/lib/session';

/** Assistant plein écran (téléphone) : pas de barre d'onglets pendant la prise de photos. */
export default async function Page() {
  const s = await requireSession();
  if (['approved', 'pending'].includes(s.profile.kyc_status) || !s.profile.full_name || !s.profile.birth_date) redirect('/app/kyc');
  return <div className="flex min-h-full flex-1 flex-col"><KycWizard userId={s.userId} /></div>;
}
