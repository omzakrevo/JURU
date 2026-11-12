import { notFound } from 'next/navigation';
import { DemoBanner } from '@/components/DemoBanner';
import { AppShell } from '@/components/layout/AppShell';
import { LoanWizard } from '@/components/LoanWizard';
import { MobileDashboard } from '@/components/MobileDashboard';
import { OfferWizard } from '@/components/OfferWizard';
import { KycWizard } from '@/components/KycWizard';
import { KycStatusCard } from '@/components/KycStatus';
import { ContractView } from '@/components/ContractView';
import { StatusBadge, Table, Td } from '@/components/ui';
import Link from 'next/link';
import { Briefcase, HandCoins, Send, ScanFace } from 'lucide-react';

/** Aperçu de l'interface avec des données FICTIVES (aucune base requise). Désactivé hors NEXT_PUBLIC_UI_PREVIEW=true. */
export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NEXT_PUBLIC_UI_PREVIEW !== 'true') notFound();
  const { screen } = await params;
  const map: Record<string, { path: string; body: React.ReactNode }> = {
    dashboard: { path: '/app', body: <MobileDashboard first="Awa" kycOk nextAmt={26329} nextDate="2026-12-12" owed={130000} lentOut={80000} requests={2} offers={1} loans={1}
      loan={{ no: 1, repaid: 20000, total: 157972, href: '#' }}
      activity={[{ id: '1', title: 'Remboursement enregistré', sub: '20 000 FCFA (mode test)', when: '2026-11-12', kind: 'money' }, { id: '2', title: 'Nouvelle proposition', sub: 'Une proposition de 150 000 FCFA', when: '2026-11-10', kind: 'info' }, { id: '3', title: 'Échéance en retard', sub: 'Échéance n°1 du crédit #1', when: '2026-11-08', kind: 'alert' }]} /> },
    wizard: { path: '/app/demandes/nouvelle', body: <div className="flex min-h-full flex-1 flex-col"><LoanWizard /></div> },
    offre: { path: '/app/offres/nouvelle', body: <div className="flex min-h-full flex-1 flex-col"><OfferWizard /></div> },
    kyc: { path: '/app/kyc/nouvelle', body: <div className="flex min-h-full flex-1 flex-col"><KycWizard userId="00000000-0000-4000-8000-0000000000b1" /></div> },
    'kyc-statut': { path: '/app/kyc', body: <KycStatusCard status="not_started" /> },
    contrat: { path: '/app/contrats/x', body: <ContractView me="borrower" loanId={null} c={{ id: 'x', contract_no: 7, application_id: 'a', borrower_id: 'b', lender_id: 'l', principal: 150000, annual_rate_bps: 1800, duration_months: 6, interest_total: 7972, fee_total: 3000, net_disbursed: 147000, total_repayable: 157972, total_cost: 10972, effective_annual_rate_bps: 2827, late_fee_bps: 200, grace_days: 3, terms_version: 'v1-demo', terms_hash: '9f2c5e7a1b3d4c6e8f0a2b4d6e8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f', status: 'partially_signed', borrower_signed_at: null, lender_signed_at: '2026-11-12T09:30:00Z', created_at: '2026-11-12T09:00:00Z',
      schedule_snapshot: [{ no: 1, month_offset: 1, principal: 24079, interest: 2250, total: 26329 }, { no: 2, month_offset: 2, principal: 24440, interest: 1889, total: 26329 }, { no: 3, month_offset: 3, principal: 24807, interest: 1522, total: 26329 }] }} /> },
    nouveau: { path: '/app/nouveau', body: (
      <div className="grid grid-cols-2 gap-3">
        {[['tile-coral', Briefcase, 'Demander un financement', 'De 5 000 à 500 000 FCFA'], ['tile-sun', HandCoins, 'Publier une offre', 'Prêtez à vos conditions'], ['tile-sky', Send, 'Parcourir le marché', 'Offres et demandes'], ['tile-violet', ScanFace, 'Vérifier mon identité', 'Obligatoire pour démarrer']].map(([c, I, t, d]) => {
          const Icon = I as typeof Send;
          return <Link key={t as string} href="#" className={`tile ${c} aspect-square`}><Icon className="h-9 w-9" strokeWidth={2.2} /><span><span className="block text-lg font-semibold leading-tight">{t as string}</span><span className="mt-1 block text-xs font-semibold opacity-80">{d as string}</span></span></Link>;
        })}
      </div>) },
    credits: { path: '/app/credits', body: (
      <Table head={['N°', 'Rôle', 'Capital', 'Remboursé', 'Statut']}>
        <tr><Td>#1</Td><Td>Emprunteur</Td><Td className="font-semibold">150 000 FCFA</Td><Td>20 000 FCFA</Td><Td><StatusBadge status="active" /></Td></tr>
        <tr><Td>#2</Td><Td>Prêteur</Td><Td className="font-semibold">80 000 FCFA</Td><Td>0 FCFA</Td><Td><StatusBadge status="awaiting_disbursement" /></Td></tr>
      </Table>) },
  };
  const sc = map[screen];
  if (!sc) notFound();
  return <AppShell banner={<DemoBanner compact />} name="Awa Démo" unread={3} isStaff={false} pathOverride={sc.path}>{sc.body}</AppShell>;
}
