import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { OtpInput } from '@/components/auth/OtpInput';
import { verifyOtp } from '@/app/actions/auth';
import { maskPhone } from '@/lib/phone';

export const metadata: Metadata = { title: 'Vérification du code' };
const d = (ms: number) => ({ animationDelay: `${ms}ms` });

export default async function Page({ searchParams }: { searchParams: Promise<{ phone?: string; mode?: string; next?: string }> }) {
  const sp = await searchParams;
  const phone = sp.phone ?? '';
  return (
    <div className="text-center">
      <h1 className="ob-rise text-[34px] font-black leading-tight tracking-tight">Entrez votre code</h1>
      <p className="ob-rise mt-2 text-base text-muted" style={d(80)}>Un SMS a été envoyé au <strong className="text-fg">{maskPhone(phone)}</strong>.</p>
      <div className="mt-8 text-left">
        <ActionForm action={verifyOtp} submit="Valider" variant="hero" className="!space-y-6">
          <input type="hidden" name="phone" value={phone} /><input type="hidden" name="mode" value={sp.mode ?? 'login'} /><input type="hidden" name="next" value={sp.next ?? ''} />
          <div className="ob-rise" style={d(160)}><OtpInput /></div>
        </ActionForm>
      </div>
      <p className="ob-rise mt-7 text-base text-muted" style={d(240)}>Pas reçu ? <Link href={sp.mode === 'signup' ? '/inscription' : '/connexion'} className="font-extrabold text-primary hover:underline">Renvoyer un code</Link></p>
    </div>
  );
}
