import type { Metadata } from 'next';
import { Hero, Section } from '@/components/public/Sections';

export const metadata: Metadata = { title: 'FAQ', description: 'Réponses aux questions fréquentes sur JURU.' };
const faq = [
  ['JURU est-elle une banque ?', 'Non. JURU est une plateforme de mise en relation. Elle n’est pas un établissement financier agréé et travaille avec des partenaires financiers réglementés.'],
  ['JURU détient-elle mon argent ?', 'Non. Les fonds ne sont jamais conservés sur un compte ordinaire de l’entreprise : les flux sont prévus via des partenaires autorisés.'],
  ['Peut-on déjà emprunter ou prêter de l’argent réel ?', 'Pas encore. Aucun paiement réel n’est activé avant validation juridique, réglementaire, contractuelle et technique. La plateforme est en mode démonstration.'],
  ['Quels montants et durées ?', 'De 5 000 à 500 000 FCFA, sur 1 à 12 mois au lancement (paramètres définis par pays).'],
  ['Quels moyens de paiement ?', 'Orange Money et Moov Money sont envisagés, uniquement après contractualisation et accès aux API officielles.'],
  ['Combien ça coûte ?', 'Intérêts fixés par le prêteur + commission de mise en relation unique de 2 % du capital (min 500, max 10 000 FCFA). Le coût total et le TAEG sont affichés avant acceptation.'],
  ['Que se passe-t-il si je rembourse en retard ?', 'Après un délai de grâce, une pénalité unique (indiquée dans le contrat) s’applique et vous êtes notifié. Contactez-nous vite en cas de difficulté.'],
  ['Puis-je rembourser plus tôt ?', 'Oui. Vous payez le capital restant dû et les intérêts échus ; les intérêts futurs ne sont pas dus.'],
  ['Pourquoi le KYC ?', 'Pour prévenir la fraude et le blanchiment, et protéger emprunteurs comme prêteurs. Vos documents sont stockés de façon privée.'],
  ['Puis-je être emprunteur et prêteur ?', 'Oui, avec le même compte. Vous ne pouvez toutefois pas financer votre propre demande.'],
];
export default function Page() {
  return (
    <>
      <Hero eyebrow="FAQ" title="Questions fréquentes" />
      <Section className="max-w-3xl">
        <div className="space-y-3">
          {faq.map(([q, a]) => (
            <details key={q} className="card group p-5 open:shadow-pop">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span className="text-primary transition group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
