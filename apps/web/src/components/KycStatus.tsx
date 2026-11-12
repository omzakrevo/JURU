import { CheckCircle2, Clock3, MessageCircleQuestion, ScanFace, XCircle } from 'lucide-react';

const CFG = {
  not_started: { icon: ScanFace, bg: 'bg-[#14452F]', title: 'Vérifions votre identité', text: 'Trois photos, deux minutes. Obligatoire pour emprunter ou prêter.' },
  approved: { icon: CheckCircle2, bg: 'bg-[#14452F]', title: 'Identité validée', text: 'Vous pouvez emprunter et prêter.' },
  pending: { icon: Clock3, bg: 'bg-[#27384A]', title: 'Dossier en cours d’examen', text: 'Nous vous prévenons dès qu’une décision est prise.' },
  more_info_required: { icon: MessageCircleQuestion, bg: 'bg-[#6B5320]', title: 'Un complément est nécessaire', text: '' },
  rejected: { icon: XCircle, bg: 'bg-[#8F1C28]', title: 'Vérification refusée', text: '' },
} as const;

/** Grand état de la vérification d'identité (carte colorée). */
export function KycStatusCard({ status, message }: { status: keyof typeof CFG; message?: string | null }) {
  const c = CFG[status];
  return (
    <div className={`relative overflow-hidden rounded-[30px] ${c.bg} p-6 text-white shadow-card`}>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><c.icon className="h-8 w-8" /></span>
      <p className="relative mt-4 text-2xl font-semibold leading-tight">{c.title}</p>
      <p className="relative mt-1 text-sm text-white/85">{message || c.text}</p>
    </div>
  );
}
