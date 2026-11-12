import type { Metadata } from 'next';
import { Card, ButtonLink } from '@/components/ui';
import { CtaBand, Hero, Section } from '@/components/public/Sections';
import { Gauge, ListChecks, Wallet } from 'lucide-react';

export const metadata: Metadata = { title: 'Prêter', description: 'Publiez une offre de financement, consultez les demandes compatibles et suivez vos remboursements.' };

export default function Page() {
  return (
    <>
      <Hero eyebrow="Prêter" title="Financez des projets, à vos conditions" text="Vous fixez le montant, le taux et la durée. JURU vérifie les emprunteurs, génère le contrat et suit les échéances." cta={<ButtonLink href="/inscription" size="lg">Publier une offre</ButtonLink>} />
      <Section className="grid gap-4 md:grid-cols-3">
        {[{ i: Wallet, t: 'Votre offre', d: 'Montant disponible, montants min/max par prêt, durées, taux annuel, motifs acceptés, garantie exigée ou non.' },
          { i: ListChecks, t: 'Demandes compatibles', d: 'Le matching classe les demandes vérifiées qui respectent vos critères, avec une note de risque de A à D.' },
          { i: Gauge, t: 'Suivi en temps réel', d: 'Échéancier, remboursements reçus, retards et notifications. Rien n’est caché.' }].map((x) => (
          <Card key={x.t}><x.i className="h-6 w-6 text-primary" /><h2 className="mt-3 font-semibold">{x.t}</h2><p className="mt-1 text-sm text-muted">{x.d}</p></Card>
        ))}
      </Section>
      <Section><Card className="border-warning/40 bg-warning/10 text-sm"><strong>Prêter comporte un risque de perte en capital.</strong> Ne prêtez que des sommes dont vous pouvez vous passer
        et diversifiez. Les prêteurs doivent justifier l’origine des fonds (contrôle anti-blanchiment). JURU n’est pas un établissement financier et ne garantit pas les remboursements.</Card></Section>
      <CtaBand title="Mettez votre épargne au service de projets locaux" text="Vérification d’identité obligatoire pour protéger tout le monde." href="/inscription" label="Créer mon compte" />
    </>
  );
}
