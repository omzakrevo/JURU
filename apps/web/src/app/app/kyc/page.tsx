import { Alert, Card, PageHeader, StatusBadge } from '@/components/ui';
import { KycUploader } from '@/components/KycUploader';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/dates';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data: subs } = await supabase.from('kyc_submissions').select('id,status,document_type,submitted_at,info_request').eq('user_id', s.userId).order('created_at', { ascending: false });
  const k = s.profile.kyc_status;
  const incomplete = !s.profile.full_name || !s.profile.birth_date;
  return (
    <>
      <PageHeader title="Vérification d’identité (KYC)" subtitle="Obligatoire pour emprunter ou prêter. Vos documents sont stockés de façon privée." actions={<StatusBadge status={k} />} />
      {k === 'approved' ? <Alert tone="success" title="Identité validée">Merci ! Vous pouvez emprunter et prêter.</Alert>
        : k === 'pending' ? <Alert tone="info" title="En cours d’examen">Nous traitons votre dossier. Vous serez notifié dès qu’une décision est prise.</Alert>
        : incomplete ? <Alert tone="warning" title="Profil incomplet">Renseignez votre nom complet et votre date de naissance dans <a className="underline" href="/app/profil">votre profil</a>.</Alert>
        : <Card>{k === 'more_info_required' && <div className="mb-4"><Alert tone="info" title="Complément demandé">{subs?.[0]?.info_request}</Alert></div>}
            {k === 'rejected' && <div className="mb-4"><Alert tone="danger" title="Vérification refusée">{subs?.[0]?.info_request} Vous pouvez soumettre un nouveau dossier.</Alert></div>}
            <KycUploader userId={s.userId} /></Card>}
      {(subs ?? []).length > 0 && (<><h2 className="mb-2 mt-8 font-semibold">Historique</h2>
        <Card className="divide-y divide-border !p-0">{subs!.map((x: { id: string; status: string; document_type: string; submitted_at: string }) => <div key={x.id} className="flex items-center justify-between p-4 text-sm"><span>{x.document_type.toUpperCase()} · {formatDateTime(x.submitted_at)}</span><StatusBadge status={x.status} /></div>)}</Card></>)}
    </>
  );
}
