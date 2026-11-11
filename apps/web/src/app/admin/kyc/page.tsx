import { DecisionForm, KycDocs } from '@/components/DecisionForm';
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { reviewKyc } from '@/app/actions/admin';

type K = { id: string; user_id: string; status: string; document_type: string; document_number_last4: string | null; document_expiry: string | null; front_path: string; back_path: string | null; selfie_path: string; auto_checks: Record<string, boolean>; auto_risk_score: number; submitted_at: string; consent_at: string };

export default async function Page() {
  const { supabase } = await adminPage('kyc');
  const { data } = await supabase.from('kyc_submissions').select('*').order('submitted_at', { ascending: false }).limit(50);
  const rows = (data ?? []) as K[];
  const ids = rows.map((r) => r.user_id);
  const { data: profs } = ids.length ? await supabase.from('profiles').select('id,full_name,birth_date,city').in('id', ids) : { data: [] };
  const p = (id: string) => profs?.find((x: { id: string }) => x.id === id) as { full_name: string; birth_date: string; city: string } | undefined;
  return (
    <>
      <PageHeader title="Vérifications KYC" subtitle="Examen humain. Un agent ne peut pas valider son propre dossier." />
      {rows.length === 0 ? <EmptyState title="Aucun dossier" /> : <div className="space-y-4">{rows.map((k) => (
        <Card key={k.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{p(k.user_id)?.full_name ?? 'Utilisateur'}</p>
          <p className="text-sm text-muted">Né(e) le {p(k.user_id)?.birth_date} · {p(k.user_id)?.city} · {k.document_type.toUpperCase()} •••{k.document_number_last4} · exp. {k.document_expiry ?? '—'}</p>
          <p className="text-xs text-muted">Soumis {formatDateTime(k.submitted_at)} · consentement {formatDateTime(k.consent_at)}</p></div><StatusBadge status={k.status} /></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">{Object.entries(k.auto_checks).map(([c, ok]) => <span key={c} className={`rounded-full px-2 py-0.5 ${ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>{ok ? '✓' : '✗'} {c}</span>)}<span className="rounded-full bg-surface-2 px-2 py-0.5">Risque auto : {k.auto_risk_score}</span></div>
          <div className="mt-3"><KycDocs submissionId={k.id} paths={[{ label: 'recto', path: k.front_path }, { label: 'verso', path: k.back_path }, { label: 'selfie', path: k.selfie_path }]} /></div>
          {k.status === 'pending' ? <div className="mt-4 border-t border-border pt-4"><DecisionForm action={reviewKyc} id={k.id} yes={['approved', 'Valider']} extra={['more_info_required', 'Demander un complément']} no={['rejected', 'Refuser']} /></div> : null}</Card>))}</div>}
      <div className="mt-6"><Alert tone="info">Les documents sont dans un stockage privé ; chaque ouverture est tracée dans le journal d’audit.</Alert></div>
    </>
  );
}
