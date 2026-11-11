import type { Metadata } from 'next';
import { Prose } from '@/components/public/Sections';
import { Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Conditions d’utilisation' };
export default function Page() {
  return (
    <Prose>
      <h1 className="text-3xl font-extrabold">Conditions générales d’utilisation</h1>
      <div className="mt-4"><Alert tone="warning" title="Projet de texte — à faire valider par un conseil juridique">Ce document est un modèle de travail destiné à la phase de démonstration. Il ne doit pas être utilisé en production sans validation juridique pour le Burkina Faso et l’UEMOA.</Alert></div>
      <h2>1. Objet</h2><p>KREDIA (nom provisoire) est une plateforme de mise en relation entre emprunteurs et prêteurs. KREDIA n’est pas un établissement financier agréé et n’octroie pas elle-même de crédit.</p>
      <h2>2. Mode démonstration</h2><p>Tant que les paiements réels ne sont pas activés, tous les flux d’argent (décaissements, remboursements) sont simulés et signalés « MODE DÉMONSTRATION ». Aucun fonds réel n’est transféré.</p>
      <h2>3. Compte et vérification d’identité</h2><p>L’utilisation des services d’emprunt et de prêt est conditionnée à une vérification d’identité (KYC) et à l’exactitude des informations fournies.</p>
      <h2>4. Coûts</h2><p>Le coût total du crédit (intérêts + commission de mise en relation), le TAEG et l’échéancier sont présentés avant acceptation. Aucune commission cachée n’est appliquée.</p>
      <h2>5. Contrats</h2><p>Les conditions d’un contrat signé ne peuvent être modifiées rétroactivement. La signature électronique repose sur une acceptation explicite horodatée et des éléments de preuve techniques ; sa valeur juridique dépend du droit applicable.</p>
      <h2>6. Fonds</h2><p>Les fonds ne sont jamais conservés sur un compte ordinaire de KREDIA ; ils transitent via des partenaires autorisés, après contractualisation.</p>
      <h2>7. Responsabilités</h2><p>L’emprunteur s’engage à rembourser selon l’échéancier. Le prêteur reconnaît le risque de perte en capital. KREDIA ne garantit pas le remboursement.</p>
      <h2>8. Suspension</h2><p>KREDIA peut suspendre un compte en cas de fraude, d’information fausse ou de manquement.</p>
    </Prose>
  );
}
