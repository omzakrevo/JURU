import { describe, expect, it } from 'vitest';
import { calcSchedule, computeFee, DEFAULT_FEE, DEFAULT_RULES, effectiveAnnualRateBps, quoteLoan, validateTerms } from './loan';
import { formatBps, formatFcfa, parseFcfa, percentToBps } from './money';
import { normalizePhone } from './phone';
import { parseRpcError } from './errors';

const fmt = (p: number, r: number, m: number) => calcSchedule(p, r, m).map((i) => `${i.principal}+${i.interest}`).join(' ');

describe('calcSchedule — parité avec la fonction SQL calc_schedule (valeurs issues de PostgreSQL)', () => {
  it('150 000 FCFA, 18 %, 6 mois', () =>
    expect(fmt(150000, 1800, 6)).toBe('24079+2250 24440+1889 24807+1522 25179+1150 25557+772 25938+389'));
  it('333 333 FCFA, 24 %, 7 mois', () =>
    expect(fmt(333333, 2400, 7)).toBe('44837+6667 45734+5770 46649+4855 47582+3922 48533+2971 49504+2000 50494+1010'));
  it('12 345 FCFA, 6 %, 3 mois', () => expect(fmt(12345, 600, 3)).toBe('4094+62 4115+41 4136+21'));
  it('taux 0 : pas d’intérêt, dernière échéance absorbe l’arrondi', () =>
    expect(fmt(100000, 0, 3)).toBe('33334+0 33334+0 33332+0'));
  it('propriétés : somme du capital = montant, échéances > 0, entiers', () => {
    for (const p of [5000, 12345, 99999, 150000, 333333, 500000])
      for (const m of [1, 2, 3, 6, 7, 12, 24])
        for (const r of [0, 600, 1800, 2400]) {
          const s = calcSchedule(p, r, m);
          expect(s.reduce((a, i) => a + i.principal, 0)).toBe(p);
          expect(s).toHaveLength(m);
          s.forEach((i) => { expect(Number.isInteger(i.total)).toBe(true); expect(i.total).toBeGreaterThan(0); });
        }
  });
  it('refuse des termes invalides', () => {
    expect(() => calcSchedule(0, 1000, 3)).toThrow();
    expect(() => calcSchedule(1000, 1000, 0)).toThrow();
  });
});

describe('frais et TAEG', () => {
  it('commission 2 % bornée [500 ; 10 000]', () => {
    expect(computeFee(5000, DEFAULT_FEE)).toBe(500);
    expect(computeFee(400000, DEFAULT_FEE)).toBe(8000);
    expect(computeFee(1_000_000, DEFAULT_FEE)).toBe(10000);
    expect(computeFee(50000, null)).toBe(0);
  });
  it('devis cohérent avec SQL (TAEG et coût total)', () => {
    const q = quoteLoan(150000, 1800, 6, DEFAULT_FEE);
    expect(q.fee_total).toBe(3000);
    expect(q.net_disbursed).toBe(147000);
    expect(q.effective_annual_rate_bps).toBe(2827);
    expect(q.total_cost).toBe(q.interest_total + 3000);
    expect(q.total_repayable).toBe(150000 + q.interest_total);
    expect(quoteLoan(50000, 1200, 3, DEFAULT_FEE).effective_annual_rate_bps).toBe(2728);
  });
  it('TAEG nul sans coût', () => expect(effectiveAnnualRateBps(100000, [100000])).toBe(0));
});

describe('validation des bornes', () => {
  it('rejette hors bornes', () => {
    expect(validateTerms(DEFAULT_RULES, 4999, 3, 1000)).toMatch(/montant/);
    expect(validateTerms(DEFAULT_RULES, 500001, 3, 1000)).toMatch(/montant/);
    expect(validateTerms(DEFAULT_RULES, 50000, 13, 1000)).toMatch(/durée/);
    expect(validateTerms(DEFAULT_RULES, 50000, 3, 2500)).toMatch(/taux/);
    expect(validateTerms(DEFAULT_RULES, 50000, 3, 1000)).toBeNull();
  });
});

describe('formats et saisies', () => {
  it('FCFA', () => {
    expect(formatFcfa(150000)).toMatch(/^150\s?000\sFCFA$/);
    expect(formatFcfa(null)).toBe('—');
    expect(parseFcfa('150 000 FCFA')).toBe(150000);
    expect(parseFcfa('abc')).toBeNaN();
  });
  it('taux', () => {
    expect(formatBps(1800)).toMatch(/^18\s%$/);
    expect(formatBps(1850)).toMatch(/^18,50\s%$/);
    expect(percentToBps('18,5')).toBe(1850);
  });
  it('téléphone UEMOA', () => {
    expect(normalizePhone('70 12 34 56')).toBe('+22670123456');
    expect(normalizePhone('+226 70 12 34 56')).toBe('+22670123456');
    expect(normalizePhone('0022670123456')).toBe('+22670123456');
    expect(normalizePhone('1234')).toBeNull();
    expect(normalizePhone('07 12 34 56 78', 'CI')).toBe('+2250712345678');
  });
  it('erreurs RPC', () => {
    expect(parseRpcError({ message: 'KYC_REQUIRED: identité à vérifier' })).toEqual({ code: 'KYC_REQUIRED', message: 'identité à vérifier' });
    expect(parseRpcError({ message: 'new row violates row-level security policy', code: '42501' }).code).toBe('FORBIDDEN');
    expect(parseRpcError(null).code).toBe('UNKNOWN');
  });
});
