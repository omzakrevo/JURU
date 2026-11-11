import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { Hero, Section } from '@/components/public/Sections';
import { Eye, FileLock2, Fingerprint, KeyRound, Landmark, ScrollText, Users2, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = { title: 'Sécurité', description: 'Protection des données KYC, contrôle d’accès, double validation, journal d’audit, fonds via partenaires autorisés.' };
const items = [
  { i: Landmark, t: 'Pas de fonds sur un compte ordinaire', d: 'KREDIA ne conserve jamais l’argent des utilisateurs sur un compte courant de l’entreprise. Les flux transitent par des partenaires autorisés.' },
  { i: Fingerprint, t: 'Identité vérifiée', d: 'Emprunteurs et prêteurs passent un KYC (pièce + selfie) avec consentement explicite, examiné par la conformité.' },
  { i: FileLock2, t: 'Documents en stockage privé', d: 'Aucun lien public. Chaque fichier n’est lisible que par son propriétaire et le personnel conformité habilité.' },
  { i: Users2, t: 'Double validation', d: 'Décaissements et attributions de rôles privilégiés exigent l’accord d’un second responsable : jamais seul.' },
  { i: ScrollText, t: 'Grand livre immuable', d: 'Comptabilité en partie double, écritures non modifiables, corrections par extourne, rapprochement des transactions.' },
  { i: Eye, t: 'Journal d’audit', d: 'Les actions sensibles sont journalisées en ajout seul : qui, quoi, quand — impossible à effacer.' },
  { i: KeyRound, t: 'Autorisations côté serveur', d: 'Les règles (montants, états, rôles) sont appliquées par la base de données, pas seulement par l’interface.' },
  { i: ShieldAlert, t: 'Paiements : webhooks signés, idempotence', d: 'Vérification des signatures, clés d’idempotence contre les doubles paiements, vérification serveur des statuts.' },
];
export default function Page() {
  return (
    <>
      <Hero eyebrow="Sécurité & confiance" title="Votre confiance se mérite, chaque jour" text="Voici, concrètement, comment nous protégeons vos données et vos opérations." />
      <Section className="grid gap-4 sm:grid-cols-2">
        {items.map((x) => <Card key={x.t} className="flex gap-4"><span className="h-fit rounded-xl bg-primary-soft p-2.5 text-primary"><x.i className="h-5 w-5" /></span><div><h2 className="font-semibold">{x.t}</h2><p className="mt-1 text-sm text-muted">{x.d}</p></div></Card>)}
      </Section>
      <Section><Card className="text-sm"><strong>Transparence.</strong> Tant que les accords avec les partenaires et la validation juridique ne sont pas finalisés, la plateforme fonctionne en <strong>mode démonstration</strong> : aucun paiement ni prêt réel n’est activé, et chaque écran concerné l’indique.</Card></Section>
    </>
  );
}
