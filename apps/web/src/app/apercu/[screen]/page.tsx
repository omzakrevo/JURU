import { notFound } from 'next/navigation';
import { DemoBanner } from '@/components/DemoBanner';
import { AppShell } from '@/components/layout/AppShell';
import { LoanWizard } from '@/components/LoanWizard';
import { MobileDashboard } from '@/components/MobileDashboard';
import { StatusBadge, Table, Td } from '@/components/ui';
import Link from 'next/link';
import { Briefcase, HandCoins, Send, ScanFace } from 'lucide-react';

/** Aperçu de l'interface avec des données FICTIVES (aucune base requise). Désactivé hors NEXT_PUBLIC_UI_PREVIEW=true. */
export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NEXT_PUBLIC_UI_PREVIEW !== 'true') notFound();
  const { screen } = await params;
  const map: Record<string, { path: string; body: React.ReactNode }> = {
    dashboard: { path: '/app', body: <MobileDashboard first="Awa" kycOk nextAmt={26329} nextDate="2026-12-12" owed={130000} lentOut={0} requests={2} offers={1} loans={1} /> },
    wizard: { path: '/app/demandes/nouvelle', body: <div className="flex min-h-full flex-1 flex-col"><LoanWizard /></div> },
    nouveau: { path: '/app/nouveau', body: (
      <div className="grid grid-cols-2 gap-3">
        {[['tile-coral', Briefcase, 'Demander un financement', 'De 5 000 à 500 000 FCFA'], ['tile-sun', HandCoins, 'Publier une offre', 'Prêtez à vos conditions'], ['tile-sky', Send, 'Parcourir le marché', 'Offres et demandes'], ['tile-violet', ScanFace, 'Vérifier mon identité', 'Obligatoire pour démarrer']].map(([c, I, t, d]) => {
          const Icon = I as typeof Send;
          return <Link key={t as string} href="#" className={`tile ${c} aspect-square`}><Icon className="h-9 w-9" strokeWidth={2.2} /><span><span className="block text-lg font-extrabold leading-tight">{t as string}</span><span className="mt-1 block text-xs font-semibold opacity-80">{d as string}</span></span></Link>;
        })}
      </div>) },
    credits: { path: '/app/credits', body: (
      <Table head={['N°', 'Rôle', 'Capital', 'Remboursé', 'Statut']}>
        <tr><Td>#1</Td><Td>Emprunteur</Td><Td className="font-bold">150 000 FCFA</Td><Td>20 000 FCFA</Td><Td><StatusBadge status="active" /></Td></tr>
        <tr><Td>#2</Td><Td>Prêteur</Td><Td className="font-bold">80 000 FCFA</Td><Td>0 FCFA</Td><Td><StatusBadge status="awaiting_disbursement" /></Td></tr>
      </Table>) },
  };
  const sc = map[screen];
  if (!sc) notFound();
  return <AppShell banner={<DemoBanner compact />} name="Awa Démo" unread={3} isStaff={false} pathOverride={sc.path}>{sc.body}</AppShell>;
}
