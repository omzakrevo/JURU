import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { canSee } from '@/lib/roles';

export const dynamic = 'force-dynamic';
const esc = (v: unknown) => { let s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; // anti-injection de formules CSV

const QUERIES: Record<string, { table: string; cols: string }> = {
  loans: { table: 'loans', cols: 'loan_no,status,principal,annual_rate_bps,duration_months,interest_total,fee_total,total_repayable,amount_repaid,penalties_accrued,penalties_paid,is_simulation,disbursed_at,closed_at,created_at' },
  transactions: { table: 'payment_transactions', cols: 'id,type,provider,status,amount,fee_amount,is_simulation,idempotency_key,reconciliation_status,created_at' },
  ledger: { table: 'ledger_entries', cols: 'journal_id,account_id,debit,credit,created_at' },
  kyc: { table: 'kyc_submissions', cols: 'id,status,document_type,auto_risk_score,submitted_at,reviewed_at' },
};

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !canSee(s.roles, 'rapports')) return new NextResponse('Interdit', { status: 403 });
  const type = new URL(req.url).searchParams.get('type') ?? '';
  const def = QUERIES[type];
  if (!def) return new NextResponse('Type inconnu', { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from(def.table).select(def.cols).order('created_at', { ascending: false }).limit(5000);
  if (error) return new NextResponse(error.message, { status: 403 });
  const cols = def.cols.split(',');
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const csv = '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="juru-${type}.csv"`, 'Cache-Control': 'private, no-store' } });
}
