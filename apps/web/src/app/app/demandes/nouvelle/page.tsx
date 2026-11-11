import { Alert, Card, PageHeader } from '@/components/ui';
import { LoanRequestForm } from '@/components/LoanForms';
import { requireSession } from '@/lib/session';

export default async function Page() {
  const s = await requireSession();
  return (
    <>
      <PageHeader title="Nouvelle demande de financement" subtitle="Validation hybride : contrôles automatiques puis, si nécessaire, examen humain." />
      {s.profile.kyc_status !== 'approved' && <div className="mb-4"><Alert tone="warning" title="KYC requis">Votre identité doit être validée avant de publier une demande.</Alert></div>}
      <Card><LoanRequestForm /></Card>
    </>
  );
}
