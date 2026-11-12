import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { AutoRefresh } from '@/components/AutoRefresh';
import { ChannelFields } from '@/components/ChannelFields';
import { Alert, ButtonLink, Card, KV, PageHeader, StatusBadge } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { formatFcfa } from '@/lib/money';
import { fundDisbursement } from '@/app/actions/payments';

const LABEL: Record<string, string> = {
  awaiting_funding: 'En attente de votre versement', funding_in_progress: 'Paiement en cours', paying_out: 'Versement à l’emprunteur en cours',
  succeeded: 'Crédit décaissé', failed: 'Paiement non abouti', payout_failed: 'Versement emprunteur échoué (traitement manuel)',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data: d } = await supabase.from('disbursements').select('*').eq('id', id).eq('lender_id', s.userId).maybeSingle();
  if (!d) notFound();
  const { data: txn } = await supabase.from('payment_transactions').select('status,checkout_url,failure_reason').eq('disbursement_id', id).eq('purpose', 'disbursement_collect').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const waiting = ['funding_in_progress', 'paying_out'].includes(d.status);
  return (
    <>
      <PageHeader title="Financer le crédit" subtitle="Étape de collecte des fonds du prêteur." actions={<StatusBadge status={d.status === 'succeeded' ? 'paid' : d.status === 'failed' ? 'failed' : 'pending'} />} />
      <div className="mb-4"><Alert tone="warning" title="MODE TEST SAS PAY">Environnement de test : aucun argent réel n’est débité ni versé.</Alert></div>
      <AutoRefresh active={waiting} />
      <Card>
        <dl><KV label="Montant à verser">{formatFcfa(d.gross_amount)}</KV><KV label="Commission JURU (prélevée au décaissement)">{formatFcfa(d.fee_amount)}</KV><KV label="Net versé à l’emprunteur">{formatFcfa(d.net_amount)}</KV><KV label="État">{LABEL[d.status] ?? d.status}</KV></dl>
        {d.status === 'awaiting_funding' && (
          <ActionForm action={fundDisbursement} submit={`Payer ${formatFcfa(d.gross_amount)} (test)`} variant="accent" className="mt-4">
            <input type="hidden" name="id" value={id} /><ChannelFields />
          </ActionForm>)}
        {d.status === 'funding_in_progress' && txn?.checkout_url && <div className="mt-4"><p className="mb-2 text-sm">Terminez le paiement sur la page de l’opérateur :</p><ButtonLink href={txn.checkout_url} target="_blank" rel="noopener noreferrer">Ouvrir la page de paiement</ButtonLink></div>}
        {d.status === 'funding_in_progress' && !txn?.checkout_url && <p className="mt-4 text-sm text-muted">Validez la demande reçue sur votre téléphone. Cette page se met à jour automatiquement.</p>}
        {d.status === 'failed' && <div className="mt-4"><Alert tone="danger" title="Paiement non abouti">{txn?.failure_reason ?? 'Le paiement a échoué ou a expiré.'} Le décaissement pourra être redemandé par l’équipe.</Alert></div>}
        {d.status === 'succeeded' && <div className="mt-4"><ButtonLink href={`/app/credits/${d.loan_id}`}>Voir le crédit</ButtonLink></div>}
      </Card>
    </>
  );
}
