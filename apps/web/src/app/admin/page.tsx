import Link from 'next/link';
import { AlertTriangle, Banknote, Briefcase, FileText, ScanFace, ShieldCheck, Users } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { Alert, Card, PageHeader, Stat } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatFcfa } from '@/lib/money';
import { runOverdueJob } from '@/app/actions/admin';

type Stats = Record<string, number | boolean>;
const Bar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div className="flex items-center gap-3 text-sm"><span className="w-40 shrink-0 text-muted">{label}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div><span className="w-10 text-right font-semibold">{value}</span></div>);

export default async function Page() {
  const { s, supabase } = await adminPage('dashboard');
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  const st = (data ?? {}) as Stats;
  const n = (k: string) => Number(st[k] ?? 0);
  const todo = [['kyc_pending', 'KYC à examiner', '/admin/kyc'], ['requests_pending_review', 'Demandes à examiner', '/admin/demandes'], ['offers_pending_review', 'Offres à examiner', '/admin/offres'], ['approvals_pending', 'Validations en attente', '/admin/validations'], ['loans_awaiting_disbursement', 'Crédits à décaisser', '/admin/credits'], ['disputes_open', 'Litiges ouverts', '/admin/litiges']] as const;
  const max = Math.max(1, ...todo.map(([k]) => n(k)));
  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d’ensemble de la plateforme." />
      {st.simulation_mode && <div className="mb-5"><Alert tone="warning" title="MODE DÉMONSTRATION actif">Aucun pays n’a activé les paiements réels : tous les décaissements et remboursements sont simulés.</Alert></div>}
      {error && <Alert tone="danger">{error.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={n('users_total')} icon={<Users className="h-4 w-4" />} />
        <Stat label="Crédits actifs / en retard" value={`${n('loans_active')} / ${n('loans_overdue')}`} icon={<FileText className="h-4 w-4" />} />
        <Stat label="Capital en cours" value={formatFcfa(n('principal_outstanding'))} icon={<Banknote className="h-4 w-4" />} />
        <Stat label="Volume décaissé (simulé)" value={formatFcfa(n('volume_disbursed'))} icon={<Briefcase className="h-4 w-4" />} />
        <Stat label="Commissions" value={formatFcfa(n('fees_revenue'))} hint="Compte 4010" icon={<ShieldCheck className="h-4 w-4" />} />
        <Stat label="Pénalités" value={formatFcfa(n('penalty_revenue'))} hint="Compte 4020" />
        <Stat label="Demandes / offres ouvertes" value={`${n('requests_open')} / ${n('offers_active')}`} icon={<ScanFace className="h-4 w-4" />} />
        <Stat label="Retards > seuil de défaut" value={n('overdue_over_default_threshold')} icon={<AlertTriangle className="h-4 w-4" />} hint="À qualifier par un agent crédit" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-semibold">File de travail</h2><div className="space-y-3">{todo.map(([k, l, h]) => <Link key={k} href={h} className="block"><Bar label={l} value={n(k)} max={max} /></Link>)}</div></Card>
        {s.roles.some((r) => ['super_admin', 'finance_manager'].includes(r)) && <Card><h2 className="font-semibold">Tâches planifiées</h2><p className="mb-3 mt-1 text-sm text-muted">Passe les échéances impayées en retard (pénalité unique) et crée les rappels J-3/J-1/J. En production, planifiez ces appels (pg_cron — voir docs/DEPLOY.md).</p><ActionForm action={runOverdueJob} submit="Exécuter maintenant" variant="outline" /></Card>}
      </div>
    </>
  );
}
