import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { CtaBand, Hero, Section } from '@/components/public/Sections';
import { ButtonLink } from '@/components/ui';

export const metadata: Metadata = { title: 'Comment ça marche', description: 'De l’inscription au remboursement : le parcours JURU en 8 étapes, avec validation hybride et double validation des décaissements.' };

const steps = [
  ['Inscription', 'Numéro de téléphone + code OTP. Vous pouvez être emprunteur et prêteur avec le même compte.'],
  ['Vérification d’identité (KYC)', 'Pièce d’identité recto-verso et selfie, avec votre consentement. Statut : en attente, validé, refusé ou complément demandé.'],
  ['Publication', 'L’emprunteur décrit son besoin (montant, motif, durée, revenus). Le prêteur publie son offre (montant disponible, taux, durée).'],
  ['Validation hybride', 'Contrôles automatiques (capacité de remboursement, score de risque) puis examen humain selon le risque.'],
  ['Matching & propositions', 'Recherche, filtres et recommandations. Le prêteur propose ; l’emprunteur compare et accepte en voyant le coût total.'],
  ['Contrat & signature', 'Contrat PDF avec récapitulatif du coût total, échéancier et TAEG. Signature électronique des deux parties. Aucune modification rétroactive.'],
  ['Décaissement', 'Les opérations sensibles exigent une double validation interne. Les flux passent par des partenaires autorisés. En démonstration : simulation signalée.'],
  ['Remboursement', 'Rappels avant échéance, paiements partiels ou anticipés, pénalités de retard connues dès la signature, clôture automatique.'],
];

export default function Page() {
  return (
    <>
      <Hero eyebrow="Fonctionnement" title="Du premier clic au dernier remboursement" text="Un parcours encadré, transparent et traçable, pensé pour le Burkina Faso." cta={<ButtonLink href="/inscription" size="lg">Commencer</ButtonLink>} />
      <Section>
        <ol className="grid gap-4 md:grid-cols-2">
          {steps.map(([t, d], i) => (
            <li key={t}><Card className="flex h-full gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">{i + 1}</span>
              <div><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-muted">{d}</p></div>
            </Card></li>
          ))}
        </ol>
      </Section>
      <CtaBand title="Prêt à démarrer ?" text="Créez votre compte en quelques minutes." href="/inscription" label="Créer mon compte" />
    </>
  );
}
