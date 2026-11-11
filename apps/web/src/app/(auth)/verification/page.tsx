import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { Field, Input } from '@/components/ui';
import { verifyOtp } from '@/app/actions/auth';
import { maskPhone } from '@/lib/phone';

export const metadata: Metadata = { title: 'Vérification du code' };

export default async function Page({ searchParams }: { searchParams: Promise<{ phone?: string; mode?: string; next?: string }> }) {
  const sp = await searchParams;
  const phone = sp.phone ?? '';
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-extrabold tracking-tight">Entrez votre code</h1>
      <p className="mt-1 text-sm text-muted">Un SMS a été envoyé au {maskPhone(phone)}. Le code est valable quelques minutes.</p>
      <div className="mt-6">
        <ActionForm action={verifyOtp} submit="Valider">
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="mode" value={sp.mode ?? 'login'} />
          <input type="hidden" name="next" value={sp.next ?? ''} />
          <Field label="Code à 6 chiffres" htmlFor="token">
            <Input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="\d{4,8}" maxLength={8} required className="text-center text-2xl tracking-[0.5em]" />
          </Field>
        </ActionForm>
      </div>
      <p className="mt-6 text-sm text-muted">Pas reçu ? <Link href={sp.mode === 'signup' ? '/inscription' : '/connexion'} className="font-semibold text-primary hover:underline">Renvoyer un code</Link></p>
    </div>
  );
}
