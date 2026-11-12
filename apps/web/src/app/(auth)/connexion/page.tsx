import Link from 'next/link';
import type { Metadata } from 'next';
import { Lock, Mail, Phone } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { AuthInput } from '@/components/auth/AuthInput';
import { Alert } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { sendOtp, signInStaff } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Connexion' };
const d = (ms: number) => ({ animationDelay: `${ms}ms` });

export default async function Page({ searchParams }: { searchParams: Promise<{ staff?: string; error?: string }> }) {
  const sp = await searchParams;
  const staff = sp.staff === '1';
  return (
    <div className="text-center">
      <h1 className="ob-rise text-[34px] font-black leading-tight tracking-tight">Bon retour 👋</h1>
      <p className="ob-rise mt-2 text-base text-muted" style={d(80)}>{staff ? 'Accès réservé à l’équipe JURU.' : 'Entrez votre numéro : nous vous envoyons un code par SMS.'}</p>
      {!isSupabaseConfigured() && <div className="mt-4 text-left"><Alert tone="warning" title="Serveur non configuré">Renseignez les variables Supabase (voir docs/INSTALL.md).</Alert></div>}
      {sp.error === 'suspended' && <div className="mt-4 text-left"><Alert tone="danger">Votre compte est suspendu. Contactez le support.</Alert></div>}
      <div className="ob-rise mx-auto mt-6 inline-flex rounded-full bg-surface-2 p-1 text-sm font-extrabold shadow-inner" role="tablist" style={d(140)}>
        <Link href="/connexion" role="tab" aria-selected={!staff} className={`rounded-full px-6 py-2.5 transition ${!staff ? 'bg-surface shadow-card' : 'text-muted'}`}>Particulier</Link>
        <Link href="/connexion?staff=1" role="tab" aria-selected={staff} className={`rounded-full px-6 py-2.5 transition ${staff ? 'bg-surface shadow-card' : 'text-muted'}`}>Équipe</Link>
      </div>
      <div className="mt-7 text-left">
        {staff ? (
          <ActionForm action={signInStaff} submit="Se connecter" variant="hero" className="!space-y-5">
            <AuthInput className="ob-rise" style={d(200)} label="E-mail professionnel" id="email" name="email" type="email" autoComplete="username" required icon={<Mail className="h-6 w-6" />} />
            <AuthInput className="ob-rise" style={d(260)} label="Mot de passe" id="password" name="password" type="password" autoComplete="current-password" required icon={<Lock className="h-6 w-6" />} />
          </ActionForm>
        ) : (
          <ActionForm action={sendOtp} submit="Recevoir mon code" variant="hero" className="!space-y-5">
            <input type="hidden" name="mode" value="login" />
            <AuthInput className="ob-rise" style={d(200)} label="Numéro de téléphone" id="phone" name="phone" inputMode="tel" autoComplete="tel-national" placeholder="70 12 34 56" required lead={<><span aria-hidden>🇧🇫</span>+226</>} />
          </ActionForm>
        )}
      </div>
      <p className="ob-rise mt-7 text-center text-base text-muted" style={d(340)}>Pas encore de compte ? <Link href="/inscription" className="font-extrabold text-primary underline-offset-4 hover:underline">Créer un compte</Link></p>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted"><Phone className="h-3.5 w-3.5" />Ne partagez jamais votre code SMS</p>
    </div>
  );
}
