import { DEMO_MODE } from '@/lib/constants';
import { FlaskConical } from 'lucide-react';

/** Bannière obligatoire : tant que les paiements réels ne sont pas activés, tout est simulé. */
export function DemoBanner({ compact }: { compact?: boolean }) {
  if (!DEMO_MODE) return null;
  return (
    <div role="note" className="flex items-center justify-center gap-2 bg-warning px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-black">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <span>Mode démonstration{compact ? '' : ' — aucun paiement ni prêt réel : tous les flux d’argent sont simulés'}</span>
    </div>
  );
}
