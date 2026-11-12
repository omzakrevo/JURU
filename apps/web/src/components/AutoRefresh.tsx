'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Rafraîchit la page toutes les `seconds` secondes tant qu'un paiement est en attente. */
export function AutoRefresh({ seconds = 8, active = true }: { seconds?: number; active?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds, active]);
  return null;
}
