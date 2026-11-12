/**
 * Calculs de crédit — MIROIR de la fonction SQL `calc_schedule` / `quote_loan`.
 * Le serveur (PostgreSQL) reste la source de vérité : ce code sert aux aperçus instantanés.
 * Tous les montants sont des entiers FCFA ; la dernière échéance absorbe l'arrondi.
 */
export interface Installment {
  no: number;
  month_offset: number;
  principal: number;
  interest: number;
  total: number;
}

export interface CountryRules {
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  max_annual_rate_bps: number;
  late_fee_bps: number;
  grace_days: number;
}

export interface FeeRule {
  calc_method: 'percent_bps' | 'fixed';
  value: number;
  min_amount: number;
  max_amount: number | null;
}

export interface Quote {
  principal: number;
  annual_rate_bps: number;
  duration_months: number;
  installments: Installment[];
  monthly_payment: number;
  interest_total: number;
  fee_total: number;
  net_disbursed: number;
  total_repayable: number;
  total_cost: number;
  effective_annual_rate_bps: number;
}

/** Arrondi « half away from zero » comme PostgreSQL round(numeric). */
const round = (x: number) => (x < 0 ? -Math.round(-x) : Math.round(x));

export function calcSchedule(principal: number, rateBps: number, months: number): Installment[] {
  if (!(principal > 0) || !(months >= 1)) throw new Error('INVALID_TERMS');
  const r = rateBps / 10000 / 12;
  const pay = r === 0 ? Math.ceil(principal / months) : round((principal * r) / (1 - Math.pow(1 + r, -months)));
  const out: Installment[] = [];
  let bal = principal;
  for (let i = 1; i <= months; i++) {
    const interest = round(bal * r);
    const prin = i === months ? bal : Math.min(Math.max(pay - interest, 0), bal);
    out.push({ no: i, month_offset: i, principal: prin, interest, total: prin + interest });
    bal -= prin;
  }
  return out;
}

/** TAEG par dichotomie sur le taux mensuel (flux : -net à t0, +échéances). */
export function effectiveAnnualRateBps(net: number, totals: number[]): number {
  if (net <= 0 || totals.reduce((a, b) => a + b, 0) <= net) return 0;
  let lo = 0;
  let hi = 5;
  let mid = 0;
  for (let k = 0; k < 80; k++) {
    mid = (lo + hi) / 2;
    let f = -net;
    totals.forEach((t, idx) => (f += t / Math.pow(1 + mid, idx + 1)));
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return round((Math.pow(1 + mid, 12) - 1) * 10000);
}

export function computeFee(principal: number, rule: FeeRule | null): number {
  if (!rule) return 0;
  let v = rule.calc_method === 'percent_bps' ? round((principal * rule.value) / 10000) : rule.value;
  v = Math.max(v, rule.min_amount);
  if (rule.max_amount !== null) v = Math.min(v, rule.max_amount);
  return Math.min(v, principal - 1);
}

export function quoteLoan(principal: number, rateBps: number, months: number, fee: FeeRule | null): Quote {
  const installments = calcSchedule(principal, rateBps, months);
  const interest_total = installments.reduce((a, i) => a + i.interest, 0);
  const fee_total = computeFee(principal, fee);
  const net_disbursed = principal - fee_total;
  return {
    principal,
    annual_rate_bps: rateBps,
    duration_months: months,
    installments,
    monthly_payment: installments[0]!.total,
    interest_total,
    fee_total,
    net_disbursed,
    total_repayable: principal + interest_total,
    total_cost: interest_total + fee_total,
    effective_annual_rate_bps: effectiveAnnualRateBps(net_disbursed, installments.map((i) => i.total)),
  };
}

/** Validation côté client (le serveur re-valide toujours). Retourne un message ou null. */
export function validateTerms(
  rules: CountryRules,
  principal: number,
  months: number,
  rateBps: number,
): string | null {
  if (!Number.isFinite(principal)) return 'Saisissez un montant valide.';
  if (principal < rules.min_amount || principal > rules.max_amount)
    return `Le montant doit être compris entre ${rules.min_amount.toLocaleString('fr-FR')} et ${rules.max_amount.toLocaleString('fr-FR')} FCFA.`;
  if (!Number.isInteger(months) || months < rules.min_duration_months || months > rules.max_duration_months)
    return `La durée doit être comprise entre ${rules.min_duration_months} et ${rules.max_duration_months} mois.`;
  if (!Number.isFinite(rateBps) || rateBps < 0 || rateBps > rules.max_annual_rate_bps)
    return `Le taux annuel ne peut pas dépasser ${rules.max_annual_rate_bps / 100} %.`;
  return null;
}

export const DEFAULT_RULES: CountryRules = {
  min_amount: 5000, max_amount: 500000, min_duration_months: 1, max_duration_months: 12,
  max_annual_rate_bps: 2400, late_fee_bps: 200, grace_days: 3,
};
export const DEFAULT_FEE: FeeRule = { calc_method: 'percent_bps', value: 200, min_amount: 500, max_amount: 10000 };
