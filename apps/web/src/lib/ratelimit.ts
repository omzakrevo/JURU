import 'server-only';
import { headers } from 'next/headers';

/**
 * Limiteur de requêtes en mémoire (fenêtre glissante) — protège les actions publiques/sensibles.
 * LIMITE : état propre à chaque instance. En production multi-instances, doubler avec une limitation
 * au niveau du reverse proxy (nginx limit_req) ou Redis. Voir docs/SECURITY.md.
 */
const hits = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export async function rateLimit(bucket: string, max: number, windowMs: number, key?: string): Promise<boolean> {
  const id = `${bucket}:${key ?? (await clientIp())}`;
  const now = Date.now();
  const arr = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(id, arr); return false; }
  arr.push(now);
  hits.set(id, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
