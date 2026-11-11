import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '1.2.3.4' }) }));

describe('rateLimit', () => {
  it('bloque au-delà du plafond puis libère après la fenêtre', async () => {
    const { rateLimit } = await import('./ratelimit');
    for (let i = 0; i < 3; i++) expect(await rateLimit('t', 3, 50, 'k')).toBe(true);
    expect(await rateLimit('t', 3, 50, 'k')).toBe(false);
    expect(await rateLimit('t', 3, 50, 'autre')).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(await rateLimit('t', 3, 50, 'k')).toBe(true);
  });
});
