'use client';
import { useState } from 'react';
import { ActionForm } from '@/components/ActionForm';
import { Badge, KV, StatusBadge } from '@/components/ui';
import { formatBps, formatFcfa } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { respondApplication } from '@/app/actions/app';
import type { Application } from '@/types';

/** Présente TOUT le coût du crédit avant acceptation ; l'acceptation exige de confirmer le coût total. */
export function ApplicationCard({ a, lenderName, canRespond }: { a: Application; lenderName?: string; canRespond: boolean }) {
  const [open, setOpen] = useState(false);
  const q = a.quote;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-semibold">{lenderName ?? 'Prêteur'} propose {formatFcfa(a.principal)}</p>
          <p className="text-sm text-muted">{a.duration_months} mois · {formatBps(a.annual_rate_bps)} par an · expire le {formatDate(a.expires_at)}</p></div>
        <StatusBadge status={a.status} />
      </div>
      {a.message && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm italic">« {a.message} »</p>}
      <dl className="mt-3">
        <KV label="Mensualité">{formatFcfa(q.monthly_payment)}</KV>
        <KV label="Intérêts totaux">{formatFcfa(q.interest_total)}</KV>
        <KV label="Commission JURU (unique, prélevée au décaissement)">{formatFcfa(q.fee_total)}</KV>
        <KV label="Montant net reçu">{formatFcfa(q.net_disbursed)}</KV>
        <KV label="Total à rembourser">{formatFcfa(q.total_repayable)}</KV>
        <KV label={<strong>Coût total du crédit</strong>}><strong>{formatFcfa(a.total_cost)}</strong></KV>
        <KV label="TAEG">{formatBps(q.effective_annual_rate_bps)}</KV>
      </dl>
      <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm font-semibold text-primary">{open ? 'Masquer' : 'Voir'} l’échéancier</button>
      {open && <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead className="text-left text-xs text-muted"><tr><th>N°</th><th>Capital</th><th>Intérêts</th><th className="text-right">Total</th></tr></thead>
        <tbody>{q.installments.map((i) => <tr key={i.no} className="border-t border-border"><td className="py-1">{i.no}</td><td>{formatFcfa(i.principal)}</td><td>{formatFcfa(i.interest)}</td><td className="text-right">{formatFcfa(i.total)}</td></tr>)}</tbody></table></div>}
      {canRespond && a.status === 'proposed' && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <ActionForm action={respondApplication} submit="Accepter et créer le contrat" variant="accent">
            <input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="accept" /><input type="hidden" name="total_cost" value={a.total_cost} />
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="ack" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" /><span>J’ai pris connaissance du coût total de <strong>{formatFcfa(a.total_cost)}</strong>, du TAEG et de l’échéancier.</span></label>
          </ActionForm>
          <ActionForm action={respondApplication} submit="Refuser" variant="outline"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="reject" /></ActionForm>
        </div>)}
      {!canRespond && <div className="mt-2"><Badge>Vue prêteur</Badge></div>}
    </div>
  );
}
