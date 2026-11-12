import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { Card, Field, Input, Textarea } from '@/components/ui';
import { Hero, Section } from '@/components/public/Sections';
import { sendContact } from '@/app/actions/contact';

export const metadata: Metadata = { title: 'Contact' };
export default function Page() {
  return (
    <>
      <Hero eyebrow="Contact" title="Une question ? Écrivez-nous." text="Nous répondons sous 48 h ouvrées." />
      <Section className="grid max-w-5xl gap-6 md:grid-cols-[1fr_.6fr]">
        <Card>
          <ActionForm action={sendContact} submit="Envoyer le message">
            <div className="hidden" aria-hidden><label>Ne pas remplir<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" htmlFor="name"><Input id="name" name="name" required minLength={2} /></Field>
              <Field label="Sujet" htmlFor="subject"><Input id="subject" name="subject" required minLength={3} /></Field>
              <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" /></Field>
              <Field label="Téléphone" htmlFor="phone"><Input id="phone" name="phone" inputMode="tel" /></Field>
            </div>
            <p className="help">Indiquez au moins un e-mail ou un téléphone pour que nous puissions vous répondre.</p>
            <Field label="Message" htmlFor="message"><Textarea id="message" name="message" rows={6} required minLength={10} maxLength={3000} /></Field>
          </ActionForm>
        </Card>
        <Card className="h-fit text-sm"><h2 className="font-semibold">Informations</h2>
          <p className="mt-2 text-muted">JURU — plateforme de mise en relation. Burkina Faso.</p>
          <p className="mt-3 text-muted">Pour une réclamation sur un contrat, ouvrez un litige depuis votre espace (« Mes crédits »).</p>
          <p className="mt-3 text-xs text-muted">Ne transmettez jamais votre code OTP ni de mot de passe : l’équipe JURU ne vous les demandera jamais.</p></Card>
      </Section>
    </>
  );
}
