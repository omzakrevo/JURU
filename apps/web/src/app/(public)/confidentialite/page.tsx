import type { Metadata } from 'next';
import { Prose } from '@/components/public/Sections';
import { Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Politique de confidentialité' };
export default function Page() {
  return (
    <Prose>
      <h1 className="text-3xl font-semibold">Politique de confidentialité</h1>
      <div className="mt-4"><Alert tone="warning" title="Projet de texte — à faire valider par un conseil juridique">À adapter à la réglementation applicable (protection des données personnelles, autorité nationale compétente) avant toute mise en production.</Alert></div>
      <h2>Données collectées</h2><ul><li>Identité : nom, date de naissance, téléphone, ville, pièce d’identité (recto/verso) et selfie (avec consentement).</li><li>Situation financière déclarée : revenus, charges.</li><li>Données d’usage : demandes, offres, contrats, transactions (simulées en démonstration), journaux de sécurité.</li></ul>
      <h2>Finalités</h2><p>Vérifier l’identité, évaluer les demandes, générer les contrats, prévenir la fraude et le blanchiment, respecter les obligations légales, vous notifier (SMS, notifications).</p>
      <h2>Protection</h2><p>Documents KYC en stockage privé à accès strictement contrôlé ; contrôle d’accès par rôles côté serveur ; journalisation des accès sensibles ; chiffrement en transit.</p>
      <h2>Conservation</h2><p>Durées configurables par pays (par défaut : documents KYC 5 ans après la fin de la relation, données contractuelles 10 ans). Valeurs à confirmer par la conformité.</p>
      <h2>Vos droits</h2><p>Accès, rectification, opposition, effacement dans les limites des obligations légales : écrivez-nous via la page Contact.</p>
      <h2>Consentements</h2><p>Votre consentement au traitement KYC est recueilli de façon explicite, horodatée et versionnée ; vous pouvez le retirer, sous réserve des obligations de conservation.</p>
    </Prose>
  );
}
