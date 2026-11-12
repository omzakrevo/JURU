import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSandboxGateway } from '@/lib/payments';
import { supabaseStore } from '@/lib/payments/store';
import { runPaymentWorker } from '@/lib/payments/worker';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * Déclenché par un cron (toutes les minutes) : curl -X POST -H "Authorization: Bearer $PAYMENTS_WORKER_TOKEN" https://…/api/payments/worker
 * Protégé par un jeton secret (comparaison à temps constant). N'agit qu'en mode test SAS Pay.
 */
export async function POST(req: Request) {
  const expected = process.env.PAYMENTS_WORKER_TOKEN;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const a = Buffer.from(given), b = Buffer.from(expected ?? '');
  if (!expected || expected.length < 24 || a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse('Unauthorized', { status: 401 });
  if (!(await rateLimit('pay-worker', 30, 60_000, 'global'))) return new NextResponse('Too many requests', { status: 429 });
  try {
    const report = await runPaymentWorker(supabaseStore(createAdminClient()), getSandboxGateway());
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).name === 'NotConfiguredError' ? 'SAS Pay non configuré' : 'Erreur worker' }, { status: 500 });
  }
}
