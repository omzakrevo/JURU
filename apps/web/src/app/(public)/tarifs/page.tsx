import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { Hero, Section } from '@/components/public/Sections';
import { Simulator } from '@/components/public/Simulator';

export const metadata: Metadata = { title: 'Tarifs', description: 'Une seule commission, visible et plafonnée. Aucune commission cachée.' };
export default function Page() {
  return (
    <>
      <Hero eyebrow="Tarifs" title="Une seule commission. Toujours visible." text="Pas de frais de dossier cachés, pas de frais d’inscription. Tout est affiché avant que vous acceptiez." />
      <Section className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted">Inscription & KYC</p><p className="mt-2 text-3xl font-extrabold">Gratuit</p></Card>
        <Card className="border-accent"><p className="text-sm text-muted">Commission de mise en relation</p><p className="mt-2 text-3xl font-extrabold">2 %</p><p className="mt-1 text-sm text-muted">du capital, minimum 500 FCFA, maximum 10 000 FCFA. Payée une seule fois par l’emprunteur, prélevée au décaissement et incluse dans le coût total et le TAEG.</p></Card>
        <Card><p className="text-sm text-muted">Pénalité de retard</p><p className="mt-2 text-3xl font-extrabold">2 %</p><p className="mt-1 text-sm text-muted">du montant échu impayé, une fois, après le délai de grâce de 3 jours. Figée dans le contrat à la signature.</p></Card>
      </Section>
      <Section><h2 className="mb-5 text-2xl font-bold">Calculez le coût total</h2><Simulator /></Section>
      <Section><p className="text-sm text-muted">Barème valable en mode démonstration, susceptible d’évoluer avant le lancement commercial après validation juridique. Un contrat signé n’est jamais modifié rétroactivement. Les intérêts sont fixés librement par le prêteur dans la limite du plafond légal applicable.</p></Section>
    </>
  );
}
