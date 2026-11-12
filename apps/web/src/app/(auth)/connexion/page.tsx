import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { Alert, Field, Input } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { sendOtp, signInStaff } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Connexion' };

export default async function Page({ searchParams }: { searchParams: Promise<{ staff?: string; error?: string; next?: string }> }) {
  const sp = await searchParams;
  const staff = sp.staff === '1';
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-extrabold tracking-tight">Connexion</h1>
      <p className="mt-1 text-sm text-muted">{staff ? 'Accès réservé à l’équipe JURU.' : 'Recevez un code par SMS pour vous connecter.'}</p>
      {!isSupabaseConfigured() && <div className="mt-4"><Alert tone="warning" title="Serveur non configuré">Renseignez les variables Supabase (voir docs/INSTALL.md).</Alert></div>}
      {sp.error === 'suspended' && <div className="mt-4"><Alert tone="danger">Votre compte est suspendu. Contactez le support.</Alert></div>}
      <div className="mt-6 inline-flex rounded-full bg-surface-2 p-1 text-sm font-semibold" role="tablist">
        <Link href="/connexion" role="tab" aria-selected={!staff} className={`rounded-full px-4 py-1.5 ${!staff ? 'bg-surface shadow-card' : 'text-muted'}`}>Particulier</Link>
        <Link href="/connexion?staff=1" role="tab" aria-selected={staff} className={`rounded-full px-4 py-1.5 ${staff ? 'bg-surface shadow-card' : 'text-muted'}`}>Équipe</Link>
      </div>
      <div className="mt-6">
        {staff ? (
          <ActionForm action={signInStaff} submit="Se connecter">
            <Field label="E-mail professionnel" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
            <Field label="Mot de passe" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
          </ActionForm>
        ) : (
          <ActionForm action={sendOtp} submit="Recevoir mon code">
            <input type="hidden" name="mode" value="login" />
            <Field label="Numéro de téléphone" htmlFor="phone" help="Burkina Faso — ex. 70 12 34 56">
              <div className="flex gap-2"><span className="input flex w-20 items-center justify-center !px-2 text-muted">+226</span>
                <Input id="phone" name="phone" inputMode="tel" autoComplete="tel-national" placeholder="70 12 34 56" required /></div>
            </Field>
          </ActionForm>
        )}
      </div>
      <p className="mt-6 text-sm text-muted">Pas encore de compte ? <Link href="/inscription" className="font-semibold text-primary hover:underline">Créer un compte</Link></p>
    </div>
  );
}
