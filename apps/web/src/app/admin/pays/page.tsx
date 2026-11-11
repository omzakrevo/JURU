import { Alert, Card, KV, PageHeader, Badge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatBps, formatFcfa } from '@/lib/money';

type C = { code: string; name: string; is_launched: boolean; timezone: string };
type S = { country_code: string; min_amount: number; max_amount: number; min_duration_months: number; max_duration_months: number; max_annual_rate_bps: number; late_fee_bps: number; grace_days: number; default_after_days: number; auto_approve_max_amount: number; auto_approve_max_risk: number; kyc_retention_months: number; data_retention_months: number; payments_live_enabled: boolean; display_timezone: string };
export default async function Page() {
  const { supabase } = await adminPage('pays');
  const [{ data: c }, { data: s }] = await Promise.all([supabase.from('countries').select('*').order('name'), supabase.from('country_settings').select('*')]);
  const countries = (c ?? []) as C[];
  return (
    <>
      <PageHeader title="Pays & règles de conformité" subtitle="Paramètres par pays (lecture seule dans l’interface ; modification par migration/DBA tracée)." />
      <div className="mb-4"><Alert tone="warning" title="Valeurs à valider juridiquement">Plafond de taux (usure), durées de conservation et seuils sont des valeurs de démonstration à faire confirmer par la conformité avant lancement.</Alert></div>
      <div className="grid gap-4 md:grid-cols-2">{countries.filter((x) => x.is_launched).map((ct) => { const st = (s ?? []).find((x: S) => x.country_code === ct.code) as S | undefined; return st && (
        <Card key={ct.code}><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">{ct.name}</h2><Badge tone={st.payments_live_enabled ? 'danger' : 'warning'}>{st.payments_live_enabled ? 'PAIEMENTS RÉELS' : 'Simulation'}</Badge></div><dl>
          <KV label="Montants">{formatFcfa(st.min_amount)} – {formatFcfa(st.max_amount)}</KV><KV label="Durées">{st.min_duration_months}–{st.max_duration_months} mois</KV><KV label="Plafond de taux annuel">{formatBps(st.max_annual_rate_bps)}</KV>
          <KV label="Pénalité / grâce">{formatBps(st.late_fee_bps)} / {st.grace_days} j</KV><KV label="Auto-validation">≤ {formatFcfa(st.auto_approve_max_amount)} et risque ≤ {st.auto_approve_max_risk}</KV>
          <KV label="Conservation KYC / données">{st.kyc_retention_months} / {st.data_retention_months} mois</KV><KV label="Fuseau d’affichage">{st.display_timezone}</KV></dl></Card>); })}</div>
      <p className="mt-6 text-sm text-muted">Pays UEMOA préparés (non lancés) : {countries.filter((x) => !x.is_launched).map((x) => x.name).join(', ')}.</p>
    </>
  );
}
