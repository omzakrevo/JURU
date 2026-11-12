'use client';
import { useMemo, useState } from 'react';
import { ActionForm } from '@/components/ActionForm';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui';
import { DEFAULT_FEE, DEFAULT_RULES, quoteLoan, validateTerms } from '@/lib/loan';
import { formatBps, formatFcfa, percentToBps } from '@/lib/money';
import { GUARANTEE_LABELS, PURPOSES } from '@/lib/constants';
import { createLoanRequest, createOffer } from '@/app/actions/app';

const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10);

export function LoanRequestForm() {
  const [amount, setAmount] = useState('100000');
  const [months, setMonths] = useState('6');
  const [rate, setRate] = useState('18');
  const [income, setIncome] = useState('');
  const [exp, setExp] = useState('');
  const [debt, setDebt] = useState('0');
  const [g, setG] = useState('none');
  const err = validateTerms(DEFAULT_RULES, num(amount), +months, percentToBps(rate));
  const q = useMemo(() => (err ? null : quoteLoan(num(amount), percentToBps(rate), +months, DEFAULT_FEE)), [err, amount, rate, months]);
  const cap = num(income) - num(exp) - (num(debt) || 0);
  return (
    <ActionForm action={createLoanRequest} submit="Publier ma demande">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Montant souhaité (FCFA)" htmlFor="amount" help="5 000 à 500 000 FCFA"><Input id="amount" name="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <Field label="Durée (mois)" htmlFor="duration"><Select id="duration" name="duration" value={months} onChange={(e) => setMonths(e.target.value)}>{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} mois</option>)}</Select></Field>
        <Field label="Motif" htmlFor="purpose"><Select id="purpose" name="purpose">{Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Taux annuel maximum accepté (%)" htmlFor="max_rate" help="Plafond que vous acceptez de payer."><Input id="max_rate" name="max_rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required /></Field>
      </div>
      <Field label="Description du projet" htmlFor="details"><Textarea id="details" name="details" maxLength={1000} placeholder="À quoi servira ce financement ?" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Revenus mensuels" htmlFor="income"><Input id="income" name="income" inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value)} required /></Field>
        <Field label="Charges mensuelles" htmlFor="expenses"><Input id="expenses" name="expenses" inputMode="numeric" value={exp} onChange={(e) => setExp(e.target.value)} required /></Field>
        <Field label="Autres remboursements/mois" htmlFor="debt"><Input id="debt" name="debt" inputMode="numeric" value={debt} onChange={(e) => setDebt(e.target.value)} /></Field>
      </div>
      {income && exp && <p className={`text-sm ${cap > 0 ? 'text-muted' : 'text-danger'}`}>Capacité de remboursement estimée : <strong>{formatFcfa(cap)}</strong> / mois{q && cap > 0 && <> — mensualité estimée au taux maximum : <strong>{formatFcfa(q.monthly_payment)}</strong> ({Math.round((q.monthly_payment / cap) * 100)} % de la capacité)</>}</p>}
      <fieldset className="rounded-xl border border-border p-4"><legend className="px-2 text-sm font-semibold">Garantie (facultatif)</legend>
        <Select name="guarantee_type" value={g} onChange={(e) => setG(e.target.value)} aria-label="Type de garantie">{Object.entries(GUARANTEE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        {g !== 'none' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Description" htmlFor="guarantee_desc"><Input id="guarantee_desc" name="guarantee_desc" required /></Field></div>
          <Field label="Valeur estimée (FCFA)" htmlFor="guarantee_value"><Input id="guarantee_value" name="guarantee_value" inputMode="numeric" /></Field>
          {g === 'guarantor' && <><Field label="Nom du garant" htmlFor="guarantor_name"><Input id="guarantor_name" name="guarantor_name" /></Field><Field label="Téléphone du garant" htmlFor="guarantor_phone"><Input id="guarantor_phone" name="guarantor_phone" /></Field></>}</div>}
      </fieldset>
      {err ? <Alert tone="warning">{err}</Alert> : q && <Alert tone="info" title="Estimation au taux maximum">Coût total ≤ {formatFcfa(q.total_cost)} (intérêts {formatFcfa(q.interest_total)} + commission {formatFcfa(q.fee_total)}) · TAEG ≤ {formatBps(q.effective_annual_rate_bps)}. Le coût réel dépendra du taux proposé et vous sera présenté avant acceptation.</Alert>}
    </ActionForm>
  );
}

export function OfferForm() {
  return (
    <ActionForm action={createOffer} submit="Publier mon offre">
      <Field label="Titre de l’offre" htmlFor="title"><Input id="title" name="title" required minLength={3} maxLength={120} placeholder="Ex. Prêt commerce 3-9 mois" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Montant total disponible" htmlFor="amount"><Input id="amount" name="amount" inputMode="numeric" required defaultValue="300000" /></Field>
        <Field label="Minimum par prêt" htmlFor="min_amount"><Input id="min_amount" name="min_amount" inputMode="numeric" required defaultValue="10000" /></Field>
        <Field label="Maximum par prêt" htmlFor="max_amount"><Input id="max_amount" name="max_amount" inputMode="numeric" required defaultValue="150000" /></Field>
        <Field label="Durée min (mois)" htmlFor="min_duration"><Input id="min_duration" name="min_duration" inputMode="numeric" required defaultValue="1" /></Field>
        <Field label="Durée max (mois)" htmlFor="max_duration"><Input id="max_duration" name="max_duration" inputMode="numeric" required defaultValue="6" /></Field>
        <Field label="Taux annuel (%)" htmlFor="rate" help="Plafond légal applicable : 24 % (valeur de démonstration)."><Input id="rate" name="rate" inputMode="decimal" required defaultValue="15" /></Field>
      </div>
      <fieldset className="rounded-xl border border-border p-4"><legend className="px-2 text-sm font-semibold">Motifs acceptés (aucun coché = tous)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(PURPOSES).map(([k, v]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="purposes" value={k} className="h-4 w-4 accent-[rgb(var(--accent))]" />{v}</label>)}</div></fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_guarantee" className="h-4 w-4 accent-[rgb(var(--accent))]" /> Exiger une garantie</label>
    </ActionForm>
  );
}
