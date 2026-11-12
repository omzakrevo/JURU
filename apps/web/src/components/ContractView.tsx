import { Check, Download, FileSignature, ScrollText } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { Alert, ButtonLink } from '@/components/ui';
import { statusInfo } from '@/lib/constants';
import { formatDateTime } from '@/lib/dates';
import { formatBps, formatFcfa } from '@/lib/money';
import { cancelContract, signContract } from '@/app/actions/app';
import type { Contract } from '@/types';

const Row = ({ k, children, strong }: { k: string; children: React.ReactNode; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5 last:border-0"><dt className="text-sm text-muted">{k}</dt><dd className={`text-right text-sm ${strong ? 'font-extrabold' : 'font-semibold'}`}>{children}</dd></div>
);

function Step({ done, label, when, you }: { done: boolean; label: string; when: string | null; you: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? 'bg-accent text-[#08281A]' : 'border-2 border-dashed border-border text-muted'}`}>{done ? <Check className="h-5 w-5" strokeWidth={3} /> : <FileSignature className="h-5 w-5" />}</span>
      <span className="flex-1"><span className="block text-sm font-extrabold">{label}{you && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary">Vous</span>}</span><span className="block text-xs text-muted">{done ? `Signé le ${formatDateTime(when)}` : 'En attente de signature'}</span></span>
    </li>
  );
}

/** Contrat de prêt : présentation (mobile et bureau). Les conditions sont figées ; la signature exige un consentement explicite. */
export function ContractView({ c, me, loanId }: { c: Contract; me: 'borrower' | 'lender'; loanId?: string | null }) {
  const signed = me === 'borrower' ? c.borrower_signed_at : c.lender_signed_at;
  const open = ['pending_signature', 'partially_signed'].includes(c.status);
  const first = c.schedule_snapshot[0];
  return (
    <div className="flex flex-col gap-4">
      {/* Carte principale */}
      <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#1B5A3D] to-[#0F3324] p-5 text-white shadow-[0_22px_40px_-20px_rgb(15_51_36/.9)]">
        <div className="drift pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#BFE8CF]/20 blur-2xl" />
        <div className="relative flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold text-white/75"><ScrollText className="h-4 w-4" />Contrat n°{c.contract_no}</span><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold text-white">{statusInfo(c.status).label}</span></div>
        <p className="relative mt-3 text-[38px] font-black leading-none tracking-tight">{formatFcfa(c.principal)}</p>
        <p className="relative mt-2 text-sm font-semibold text-white/80">{c.duration_months} mois · {formatBps(c.annual_rate_bps)} par an</p>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-3 gap-2.5">
        {[['Mensualité', first ? formatFcfa(first.total) : '—'], ['Coût total', formatFcfa(c.total_cost)], ['TAEG', formatBps(c.effective_annual_rate_bps)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-surface p-3 text-center shadow-card"><p className="text-[11px] font-bold text-muted">{k}</p><p className="mt-1 text-sm font-black leading-tight">{v}</p></div>))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Signatures */}
        <section className="rounded-3xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-base font-extrabold">Signatures</h2>
          <ul className="space-y-4"><Step done={Boolean(c.borrower_signed_at)} label="Emprunteur" when={c.borrower_signed_at} you={me === 'borrower'} /><Step done={Boolean(c.lender_signed_at)} label="Prêteur" when={c.lender_signed_at} you={me === 'lender'} /></ul>
          {open && !signed && (
            <ActionForm action={signContract} submit="Signer le contrat" variant="primary" fullWidth className="mt-4 !space-y-3">
              <input type="hidden" name="id" value={c.id} />
              <label className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 text-sm"><input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" /><span>J’ai lu les conditions, le coût total et l’échéancier, et je signe électroniquement ce contrat.</span></label>
            </ActionForm>)}
          {c.status === 'signed' && loanId && <div className="mt-4"><ButtonLink href={`/app/credits/${loanId}`} className="w-full">Voir le crédit</ButtonLink></div>}
          <div className="mt-3 flex items-center justify-between">
            <a href={`/app/contrats/${c.id}/pdf`} className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-bold hover:bg-surface-2"><Download className="h-4 w-4" />PDF</a>
            {open && <form action={cancelContract}><input type="hidden" name="id" value={c.id} /><button className="text-sm font-bold text-danger">Annuler le contrat</button></form>}
          </div>
        </section>

        {/* Conditions */}
        <section className="rounded-3xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-1 text-base font-extrabold">Conditions</h2>
          <dl>
            <Row k="Capital">{formatFcfa(c.principal)}</Row><Row k="Taux annuel nominal">{formatBps(c.annual_rate_bps)}</Row><Row k="Durée">{c.duration_months} mois</Row>
            <Row k="Intérêts totaux">{formatFcfa(c.interest_total)}</Row><Row k="Commission JURU (unique)">{formatFcfa(c.fee_total)}</Row><Row k="Net versé à l’emprunteur">{formatFcfa(c.net_disbursed)}</Row>
            <Row k="Total à rembourser">{formatFcfa(c.total_repayable)}</Row><Row k="Coût total du crédit" strong>{formatFcfa(c.total_cost)}</Row><Row k="TAEG">{formatBps(c.effective_annual_rate_bps)}</Row>
            <Row k="Pénalité de retard">{formatBps(c.late_fee_bps)} après {c.grace_days} j</Row><Row k="Remboursement anticipé">Capital restant + intérêts échus</Row>
          </dl>
          <p className="mt-2 break-all text-[10px] text-muted">Empreinte SHA-256 : {c.terms_hash}</p>
        </section>
      </div>

      {/* Échéancier */}
      <section className="rounded-3xl border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-1 text-base font-extrabold">Échéancier</h2>
        <ul className="divide-y divide-border/70">
          {c.schedule_snapshot.map((i) => (
            <li key={i.no} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-black text-primary">{i.no}</span>
              <span className="flex-1 text-xs text-muted">Mois {i.month_offset} · capital {formatFcfa(i.principal)} · intérêts {formatFcfa(i.interest)}</span>
              <span className="text-sm font-black">{formatFcfa(i.total)}</span>
            </li>))}
        </ul>
      </section>
      <Alert tone="warning" title="Valeur juridique">La signature électronique (acceptation horodatée + preuves techniques) doit être validée par un conseil juridique avant tout usage réel. Les conditions sont figées : aucun changement rétroactif.</Alert>
    </div>
  );
}
