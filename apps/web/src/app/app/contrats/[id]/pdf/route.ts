import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';
import { formatBps, formatFcfa } from '@/lib/money';
import type { Contract } from '@/types';

export const dynamic = 'force-dynamic';

// pdf-lib (polices standard) ne gère pas l'espace insécable ni certains caractères : on normalise.
const t = (s: string) => s.replace(/[  ]/g, ' ').replace(/’/g, "'");

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS : seul un participant (ou le personnel) lit ce contrat
  const { data } = await supabase.from('loan_contracts').select('*').eq('id', id).maybeSingle();
  if (!data) return new NextResponse('Introuvable', { status: 404 });
  const c = data as Contract;
  const { data: cards } = await supabase.from('counterparty_cards').select('id,display_name');
  const nm = (u: string) => cards?.find((x: { id: string }) => x.id === u)?.display_name ?? 'Partie';

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const line = (text: string, o: { b?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(t(text), { x: 50, y, size: o.size ?? 10, font: o.b ? bold : font, color: rgb(...(o.color ?? [0.04, 0.1, 0.23])) });
    y -= (o.size ?? 10) + 6;
  };
  page.drawRectangle({ x: 0, y: 810, width: 595, height: 32, color: rgb(0.71, 0.42, 0.03) });
  page.drawText('MODE DEMONSTRATION - document sans valeur juridique - aucun fonds reel', { x: 50, y: 821, size: 10, font: bold, color: rgb(0, 0, 0) });
  y = 780;
  line('KREDIA - Contrat de pret entre particuliers', { b: true, size: 18, color: [0.04, 0.3, 0.23] });
  line(`Contrat n°${c.contract_no} - Version des conditions : ${c.terms_version}`, { size: 9 });
  y -= 8;
  line('Parties', { b: true, size: 12 });
  line(`Emprunteur : ${nm(c.borrower_id)}    Preteur : ${nm(c.lender_id)}`);
  line("KREDIA est une plateforme de mise en relation, non un etablissement financier agree. Les fonds transitent par des partenaires autorises.", { size: 8 });
  y -= 8;
  line('Conditions financieres', { b: true, size: 12 });
  [['Capital', formatFcfa(c.principal)], ['Taux annuel nominal', formatBps(c.annual_rate_bps)], ['Duree', `${c.duration_months} mois`],
    ['Interets totaux', formatFcfa(c.interest_total)], ['Commission de mise en relation (unique)', formatFcfa(c.fee_total)],
    ['Net verse a l\'emprunteur', formatFcfa(c.net_disbursed)], ['Total a rembourser', formatFcfa(c.total_repayable)],
    ['COUT TOTAL DU CREDIT', formatFcfa(c.total_cost)], ['TAEG', formatBps(c.effective_annual_rate_bps)],
    ['Penalite de retard', `${formatBps(c.late_fee_bps)} du montant echu apres ${c.grace_days} jours de grace`],
    ['Remboursement anticipe', 'capital restant du + interets echus ; interets futurs non dus']].forEach(([k, v]) => line(`${k} : ${v}`));
  y -= 8;
  line('Echeancier', { b: true, size: 12 });
  line('N°    Mois    Capital            Interets           Echeance', { b: true, size: 9 });
  c.schedule_snapshot.forEach((i) => line(`${String(i.no).padEnd(5)} M+${String(i.month_offset).padEnd(5)} ${formatFcfa(i.principal).padEnd(18)} ${formatFcfa(i.interest).padEnd(18)} ${formatFcfa(i.total)}`, { size: 9 }));
  y -= 8;
  line('Signatures electroniques', { b: true, size: 12 });
  line(`Emprunteur : ${c.borrower_signed_at ?? 'non signe'}`); line(`Preteur : ${c.lender_signed_at ?? 'non signe'}`);
  line(`Empreinte SHA-256 des conditions : ${c.terms_hash}`, { size: 7 });
  line("Les conditions ci-dessus sont immuables apres signature (aucun changement retroactif).", { size: 8 });
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="kredia-contrat-${c.contract_no}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
