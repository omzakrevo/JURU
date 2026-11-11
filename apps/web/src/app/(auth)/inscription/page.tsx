import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { Alert, Field, Input } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { sendOtp } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Créer un compte' };

export default function Page() {
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-extrabold tracking-tight">Créer votre compte</h1>
      <p className="mt-1 text-sm text-muted">Gratuit. Un code SMS vous sera envoyé pour confirmer votre numéro.</p>
      {!isSupabaseConfigured() && <div className="mt-4"><Alert tone="warning" title="Serveur non configuré">Renseignez les variables Supabase (voir docs/INSTALL.md).</Alert></div>}
      <div className="mt-6">
        <ActionForm action={sendOtp} submit="Recevoir mon code">
          <input type="hidden" name="mode" value="signup" />
          <Field label="Nom complet" htmlFor="full_name"><Input id="full_name" name="full_name" autoComplete="name" required minLength={3} /></Field>
          <Field label="Numéro de téléphone" htmlFor="phone" help="Burkina Faso — ex. 70 12 34 56">
            <div className="flex gap-2"><span className="input flex w-20 items-center justify-center !px-2 text-muted">+226</span>
              <Input id="phone" name="phone" inputMode="tel" autoComplete="tel-national" placeholder="70 12 34 56" required /></div>
          </Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
            <span>J’accepte les <Link href="/conditions" className="font-semibold text-primary underline" target="_blank">conditions d’utilisation</Link>.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="privacy" required className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
            <span>J’ai lu la <Link href="/confidentialite" className="font-semibold text-primary underline" target="_blank">politique de confidentialité</Link>.</span></label>
        </ActionForm>
      </div>
      <p className="mt-6 text-sm text-muted">Déjà inscrit ? <Link href="/connexion" className="font-semibold text-primary hover:underline">Se connecter</Link></p>
    </div>
  );
}
