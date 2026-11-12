import { notFound } from 'next/navigation';
import { ContractView } from '@/components/ContractView';
import { PageHeader } from '@/components/ui';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import type { Contract } from '@/types';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from('loan_contracts').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const c = data as Contract;
  const { data: loan } = await supabase.from('loans').select('id').eq('contract_id', id).maybeSingle();
  return (
    <>
      <div className="hidden lg:block"><PageHeader title={`Contrat de prêt n°${c.contract_no}`} subtitle="Aucun changement rétroactif n’est possible une fois signé." /></div>
      <ContractView c={c} me={s.userId === c.borrower_id ? 'borrower' : 'lender'} loanId={loan?.id ?? null} />
    </>
  );
}
