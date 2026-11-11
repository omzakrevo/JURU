import { Download } from 'lucide-react';
import { ButtonLink, Card, PageHeader } from '@/components/ui';
import { adminPage } from '@/lib/admin';

const reports = [['loans', 'Crédits', 'Tous les crédits avec statuts et montants remboursés.'], ['transactions', 'Transactions', 'Mouvements de paiement (simulés ou réels) pour rapprochement.'], ['ledger', 'Écritures comptables', 'Journal des écritures en partie double.'], ['kyc', 'Statuts KYC', 'Volumétrie et statuts des dossiers (sans documents).']];
export default async function Page() {
  await adminPage('rapports');
  return (
    <>
      <PageHeader title="Rapports" subtitle="Exports CSV respectant vos droits d’accès (RLS)." />
      <div className="grid gap-4 md:grid-cols-2">{reports.map(([k, t, d]) => <Card key={k} className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">{t}</h2><p className="text-sm text-muted">{d}</p></div><ButtonLink href={`/admin/rapports/export?type=${k}`} variant="outline" size="sm"><Download className="h-4 w-4" />CSV</ButtonLink></Card>)}</div>
    </>
  );
}
