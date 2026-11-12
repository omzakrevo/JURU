import { DEMO_MODE } from '@/lib/constants';
import { FlaskConical } from 'lucide-react';

/** Bannière obligatoire : tant que les paiements réels ne sont pas activés, tout est simulé. */
export function DemoBanner({ compact }: { compact?: boolean }) {
  if (!DEMO_MODE) return null;
  const sandbox = process.env.NEXT_PUBLIC_PAYMENT_MODE === 'sandbox';
  return (
    <div role="note" className="flex items-center justify-center gap-2 bg-[#F4E7B0] px-3 py-1 text-center text-[10px] font-semibold text-[#4A3B00]">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <span>{sandbox ? `Mode test SAS Pay${compact ? '' : ' — transactions de test, aucun argent réel'}` : `Mode démonstration${compact ? '' : ' — aucun paiement ni prêt réel : tous les flux d’argent sont simulés'}`}</span>
    </div>
  );
}
