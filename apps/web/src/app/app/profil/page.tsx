import { ActionForm } from '@/components/ActionForm';
import { Alert, Card, Field, Input, PageHeader, Select, StatusBadge } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { updateProfile } from '@/app/actions/app';

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const supabase = await createClient();
  const { data: lp } = await supabase.from('lender_profiles').select('*').eq('user_id', s.userId).maybeSingle();
  const p = s.profile;
  return (
    <>
      <PageHeader title="Mon profil" subtitle="Complétez votre profil avant la vérification d’identité (nom et date de naissance obligatoires)." actions={<StatusBadge status={p.kyc_status} />} />
      {sp.bienvenue && <div className="mb-4"><Alert tone="success" title="Bienvenue sur KREDIA !">Complétez votre profil puis lancez la vérification d’identité.</Alert></div>}
      <Card>
        <ActionForm action={updateProfile} submit="Enregistrer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={p.full_name ?? ''} required /></Field>
            <Field label="Téléphone"><Input value={p.phone ?? ''} disabled readOnly /></Field>
            <Field label="Date de naissance" htmlFor="birth_date"><Input id="birth_date" name="birth_date" type="date" defaultValue={p.birth_date ?? ''} /></Field>
            <Field label="Ville" htmlFor="city"><Input id="city" name="city" defaultValue={p.city ?? ''} /></Field>
            <div className="sm:col-span-2"><Field label="Adresse" htmlFor="address"><Input id="address" name="address" defaultValue={p.address ?? ''} /></Field></div>
            <Field label="Type de compte" htmlFor="account_type"><Select id="account_type" name="account_type" defaultValue={p.account_type}><option value="individual">Personnel</option><option value="business">Professionnel</option></Select></Field>
            <Field label="Nom de l’activité (si professionnel)" htmlFor="business_name"><Input id="business_name" name="business_name" defaultValue={p.business_name ?? ''} /></Field>
          </div>
          <fieldset className="rounded-xl border border-border p-4"><legend className="px-2 text-sm font-semibold">Mes rôles</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_borrower" defaultChecked={p.is_borrower} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Je peux emprunter</label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="is_lender" defaultChecked={p.is_lender} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Je peux prêter</label>
            <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Origine des fonds (prêteurs, contrôle anti-blanchiment)" htmlFor="source_of_funds"><Input id="source_of_funds" name="source_of_funds" defaultValue={lp?.source_of_funds ?? ''} placeholder="Ex. épargne salariale, revenus du commerce…" /></Field></div>
              <Field label="Appétence au risque" htmlFor="risk_appetite"><Select id="risk_appetite" name="risk_appetite" defaultValue={lp?.risk_appetite ?? 'moderate'}><option value="low">Faible</option><option value="moderate">Modérée</option><option value="high">Élevée</option></Select></Field>
              <Field label="Expérience" htmlFor="investment_experience"><Select id="investment_experience" name="investment_experience" defaultValue={lp?.investment_experience ?? 'none'}><option value="none">Aucune</option><option value="some">Quelques prêts</option><option value="experienced">Expérimenté</option></Select></Field>
            </div>
          </fieldset>
        </ActionForm>
      </Card>
    </>
  );
}
