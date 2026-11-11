import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { Alert, ButtonLink, Card, KV, PageHeader, StatusBadge, Table, Td } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatBps, formatFcfa } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import { cancelContract, signContract } from '@/app/actions/app';
import type { Contract } from '@/types';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('loan_contracts').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const c = data as Contract;
  const me = s.userId === c.borrower_id ? 'borrower' : 'lender';
  const signed = me === 'borrower' ? c.borrower_signed_at : c.lender_signed_at;
  const { data: loan } = await supabase.from('loans').select('id').eq('contract_id', id).maybeSingle();
  return (
    <>
      <PageHeader title={`Contrat de prêt n°${c.contract_no}`} subtitle="Aucun changement rétroactif n’est possible une fois signé." actions={<><StatusBadge status={c.status} /><ButtonLink href={`/app/contrats/${id}/pdf`} variant="outline" size="sm"><Download className="h-4 w-4" />PDF</ButtonLink></>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-2 font-semibold">Conditions financières</h2><dl>
          <KV label="Capital">{formatFcfa(c.principal)}</KV><KV label="Taux annuel nominal">{formatBps(c.annual_rate_bps)}</KV><KV label="Durée">{c.duration_months} mois</KV>
          <KV label="Intérêts totaux">{formatFcfa(c.interest_total)}</KV><KV label="Commission de mise en relation">{formatFcfa(c.fee_total)}</KV>
          <KV label="Net versé à l’emprunteur">{formatFcfa(c.net_disbursed)}</KV><KV label="Total à rembourser">{formatFcfa(c.total_repayable)}</KV>
          <KV label={<strong>Coût total du crédit</strong>}><strong>{formatFcfa(c.total_cost)}</strong></KV><KV label="TAEG">{formatBps(c.effective_annual_rate_bps)}</KV>
          <KV label="Pénalité de retard">{formatBps(c.late_fee_bps)} du montant échu, après {c.grace_days} jours de grâce</KV><KV label="Remboursement anticipé">Capital restant + intérêts échus</KV></dl>
          <p className="mt-3 break-all text-[11px] text-muted">Empreinte des conditions (SHA-256) : {c.terms_hash}</p></Card>
        <Card><h2 className="mb-2 font-semibold">Signatures</h2><dl><KV label="Emprunteur">{c.borrower_signed_at ? `Signé le ${formatDateTime(c.borrower_signed_at)}` : 'En attente'}</KV><KV label="Prêteur">{c.lender_signed_at ? `Signé le ${formatDateTime(c.lender_signed_at)}` : 'En attente'}</KV></dl>
          {c.status === 'signed' && loan && <div className="mt-4"><ButtonLink href={`/app/credits/${loan.id}`}>Voir le crédit</ButtonLink></div>}
          {['pending_signature', 'partially_signed'].includes(c.status) && !signed && (
            <ActionForm action={signContract} submit="Signer le contrat" variant="accent" className="mt-4"><input type="hidden" name="id" value={id} />
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" /><span>Je déclare avoir lu les conditions, le coût total et l’échéancier, et je signe électroniquement ce contrat.</span></label></ActionForm>)}
          {['pending_signature', 'partially_signed'].includes(c.status) && <form action={cancelContract} className="mt-3"><input type="hidden" name="id" value={id} /><button className="text-sm font-semibold text-danger">Annuler le contrat</button></form>}
          <div className="mt-4"><Alert tone="warning" title="Valeur juridique">La signature électronique (acceptation horodatée + preuves techniques) doit être validée par un conseil juridique avant tout usage réel.</Alert></div></Card>
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Échéancier contractuel</h2>
      <Table head={['N°', 'Mois', 'Capital', 'Intérêts', 'Échéance']}>{c.schedule_snapshot.map((i) => <tr key={i.no}><Td>{i.no}</Td><Td>M+{i.month_offset}</Td><Td>{formatFcfa(i.principal)}</Td><Td>{formatFcfa(i.interest)}</Td><Td className="font-semibold">{formatFcfa(i.total)}</Td></tr>)}</Table>
    </>
  );
}
