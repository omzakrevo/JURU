import { Alert, Card, PageHeader, StatusBadge } from '@/components/ui';
import { KycUploader } from '@/components/KycUploader';
import { KycStatusCard } from '@/components/KycStatus';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/dates';

export default async function Page() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data: subs } = await supabase.from('kyc_submissions').select('id,status,document_type,submitted_at,info_request').eq('user_id', s.userId).order('created_at', { ascending: false });
  const k = s.profile.kyc_status;
  const incomplete = !s.profile.full_name || !s.profile.birth_date;
  const note = subs?.[0]?.info_request as string | null | undefined;
  const form = (k === 'not_started' || k === 'more_info_required' || k === 'rejected') && !incomplete;
  return (
    <>
      {/* ===== Mobile ===== */}
      <div className="flex min-h-full flex-1 flex-col lg:hidden">
        {k === 'approved' || k === 'pending' ? (
          <div className="flex flex-col gap-4">
            <KycStatusCard status={k} />
            {(subs ?? []).length > 0 && (
              <ul className="divide-y divide-border rounded-3xl border border-border bg-surface shadow-card">
                {subs!.map((x: { id: string; status: string; document_type: string; submitted_at: string }) => <li key={x.id} className="flex items-center justify-between p-4 text-sm"><span className="font-semibold">{x.document_type.toUpperCase()} <span className="font-semibold text-muted">· {formatDateTime(x.submitted_at)}</span></span><StatusBadge status={x.status} /></li>)}
              </ul>)}
          </div>
        ) : incomplete ? (
          <div className="flex flex-col gap-4"><Alert tone="warning" title="Complétez d’abord votre profil">Indiquez votre nom complet et votre date de naissance.</Alert><a href="/app/profil" className="rounded-full bg-primary py-3.5 text-center font-semibold text-primary-fg">Ouvrir mon profil</a></div>
        ) : (
          <div className="flex flex-col gap-4">
            <KycStatusCard status={k === 'more_info_required' || k === 'rejected' ? k : 'not_started'} message={k === 'more_info_required' || k === 'rejected' ? note : null} />
            <ul className="space-y-2 rounded-3xl border border-border bg-surface p-4 text-sm font-semibold shadow-card">
              {['Choisissez votre pièce (CNIB, passeport…)', 'Photographiez-la, recto puis verso', 'Prenez un selfie avec la pièce', 'Validez : nous vous répondons rapidement'].map((t, i) => <li key={t} className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{i + 1}</span>{t}</li>)}
            </ul>
            {form && <a href="/app/kyc/nouvelle" className="rounded-full bg-primary py-4 text-center text-base font-semibold text-primary-fg shadow-[0_8px_20px_-10px_rgb(20_69_47/.8)] active:scale-[.98]">Commencer la vérification</a>}
          </div>
        )}
      </div>
      {/* ===== Bureau ===== */}
      <div className="hidden lg:block">
        <PageHeader title="Vérification d’identité (KYC)" subtitle="Obligatoire pour emprunter ou prêter. Vos documents sont stockés de façon privée." actions={<StatusBadge status={k} />} />
        {k === 'approved' ? <Alert tone="success" title="Identité validée">Vous pouvez emprunter et prêter.</Alert>
          : k === 'pending' ? <Alert tone="info" title="En cours d’examen">Nous traitons votre dossier. Vous serez notifié dès qu’une décision est prise.</Alert>
          : incomplete ? <Alert tone="warning" title="Profil incomplet">Renseignez votre nom complet et votre date de naissance dans <a className="underline" href="/app/profil">votre profil</a>.</Alert>
          : <Card>{k === 'more_info_required' && <div className="mb-4"><Alert tone="info" title="Complément demandé">{note}</Alert></div>}
              {k === 'rejected' && <div className="mb-4"><Alert tone="danger" title="Vérification refusée">{note} Vous pouvez soumettre un nouveau dossier.</Alert></div>}
              <KycUploader userId={s.userId} /></Card>}
        {(subs ?? []).length > 0 && (<><h2 className="mb-2 mt-8 font-semibold">Historique</h2>
          <Card className="divide-y divide-border !p-0">{subs!.map((x: { id: string; status: string; document_type: string; submitted_at: string }) => <div key={x.id} className="flex items-center justify-between p-4 text-sm"><span>{x.document_type.toUpperCase()} · {formatDateTime(x.submitted_at)}</span><StatusBadge status={x.status} /></div>)}</Card></>)}
      </div>
    </>
  );
}
