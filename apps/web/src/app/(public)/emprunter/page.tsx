import type { Metadata } from 'next';
import { Card, ButtonLink } from '@/components/ui';
import { CtaBand, Hero, Section } from '@/components/public/Sections';
import { Simulator } from '@/components/public/Simulator';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = { title: 'Emprunter', description: 'Demandez un financement de 5 000 à 500 000 FCFA avec un coût total affiché avant acceptation.' };

export default function Page() {
  return (
    <>
      <Hero eyebrow="Emprunter" title="Un financement clair, sans mauvaise surprise" text="De 5 000 à 500 000 FCFA, sur 1 à 12 mois. Vous voyez le coût total, le TAEG et l’échéancier avant d’accepter." cta={<ButtonLink href="/inscription" size="lg">Faire une demande</ButtonLink>} />
      <Section className="grid gap-4 md:grid-cols-3">
        {[['Ce dont vous avez besoin', ['Un téléphone Mobile Money', 'Une pièce d’identité (CNIB, passeport…)', 'Vos revenus et charges mensuels']],
          ['Ce que vous recevez', ['Des propositions de prêteurs vérifiés', 'Un contrat PDF clair', 'Des rappels avant chaque échéance']],
          ['Ce que nous garantissons', ['Aucune commission cachée', 'Aucun changement après signature', 'Remboursement anticipé possible']]].map(([t, l]) => (
          <Card key={t as string}><h2 className="font-semibold">{t as string}</h2>
            <ul className="mt-3 space-y-2 text-sm">{(l as string[]).map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{x}</li>)}</ul></Card>
        ))}
      </Section>
      <Section><h2 className="mb-5 text-2xl font-bold">Estimez votre mensualité</h2><Simulator /></Section>
      <Section><Card className="border-warning/40 bg-warning/10 text-sm">
        <strong>Emprunter engage.</strong> Ne vous endettez qu’en fonction de votre capacité de remboursement. Un retard entraîne une pénalité
        précisée dans votre contrat avant signature.</Card></Section>
      <CtaBand title="Votre projet mérite un financement clair" text="Inscription gratuite, vérification d’identité rapide." href="/inscription" label="Créer mon compte" />
    </>
  );
}
