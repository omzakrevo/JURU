import { CheckCircle2, Clock3, MessageCircleQuestion, ScanFace, XCircle } from 'lucide-react';

const CFG = {
  not_started: { icon: ScanFace, bg: 'from-[#6A45D6] to-[#46299F]', title: 'Vérifions votre identité', text: 'Trois photos, deux minutes. Obligatoire pour emprunter ou prêter.' },
  approved: { icon: CheckCircle2, bg: 'from-[#1B5A3D] to-[#0F3324]', title: 'Identité validée', text: 'Merci ! Vous pouvez emprunter et prêter.' },
  pending: { icon: Clock3, bg: 'from-[#2F6FC9] to-[#1D4E95]', title: 'Dossier en cours d’examen', text: 'Nous vous prévenons dès qu’une décision est prise.' },
  more_info_required: { icon: MessageCircleQuestion, bg: 'from-[#B07A00] to-[#7A5400]', title: 'Un complément est nécessaire', text: '' },
  rejected: { icon: XCircle, bg: 'from-[#CD2D3C] to-[#8F1C28]', title: 'Vérification refusée', text: '' },
} as const;

/** Grand état de la vérification d'identité (carte colorée). */
export function KycStatusCard({ status, message }: { status: keyof typeof CFG; message?: string | null }) {
  const c = CFG[status];
  return (
    <div className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${c.bg} p-6 text-white shadow-card`}>
      <div className="drift pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><c.icon className="h-8 w-8" /></span>
      <p className="relative mt-4 text-2xl font-black leading-tight">{c.title}</p>
      <p className="relative mt-1 text-sm text-white/85">{message || c.text}</p>
    </div>
  );
}
