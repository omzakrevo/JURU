import Link from 'next/link';
import type { Metadata } from 'next';
import { User } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { AuthInput } from '@/components/auth/AuthInput';
import { Alert } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { sendOtp } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Créer un compte' };
const d = (ms: number) => ({ animationDelay: `${ms}ms` });
const check = 'mt-0.5 h-6 w-6 shrink-0 accent-[rgb(var(--primary))]';

export default function Page() {
  return (
    <div className="text-center">
      <h1 className="ob-rise text-[34px] font-black leading-tight tracking-tight">Lancez votre activité 🚀</h1>
      <p className="ob-rise mt-2 text-base text-muted" style={d(80)}>Gratuit. Un code SMS confirme votre numéro.</p>
      {!isSupabaseConfigured() && <div className="mt-4 text-left"><Alert tone="warning" title="Serveur non configuré">Renseignez les variables Supabase (voir docs/INSTALL.md).</Alert></div>}
      <div className="mt-7 text-left">
        <ActionForm action={sendOtp} submit="Recevoir mon code" variant="hero" className="!space-y-5">
          <input type="hidden" name="mode" value="signup" />
          <AuthInput className="ob-rise" style={d(160)} label="Nom complet" id="full_name" name="full_name" autoComplete="name" required minLength={3} placeholder="Awa Ouédraogo" icon={<User className="h-6 w-6" />} />
          <AuthInput className="ob-rise" style={d(220)} label="Numéro de téléphone" id="phone" name="phone" inputMode="tel" autoComplete="tel-national" placeholder="70 12 34 56" required lead={<><span aria-hidden>🇧🇫</span>+226</>} />
          <div className="ob-rise space-y-3 rounded-3xl border border-border bg-surface p-4 shadow-card" style={d(280)}>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="terms" required className={check} /><span>J’accepte les <Link href="/conditions" className="font-bold text-primary underline" target="_blank">conditions d’utilisation</Link>.</span></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="privacy" required className={check} /><span>J’ai lu la <Link href="/confidentialite" className="font-bold text-primary underline" target="_blank">politique de confidentialité</Link>.</span></label>
          </div>
        </ActionForm>
      </div>
      <p className="ob-rise mt-7 text-center text-base text-muted" style={d(340)}>Déjà inscrit ? <Link href="/connexion" className="font-extrabold text-primary underline-offset-4 hover:underline">Se connecter</Link></p>
    </div>
  );
}
