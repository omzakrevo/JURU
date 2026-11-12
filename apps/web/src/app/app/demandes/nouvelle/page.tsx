import { Alert, Card, PageHeader } from '@/components/ui';
import { LoanRequestForm } from '@/components/LoanForms';
import { LoanWizard } from '@/components/LoanWizard';
import { requireSession } from '@/lib/session';

export default async function Page() {
  const s = await requireSession();
  return (
    <>
      <div className="flex min-h-full flex-1 flex-col lg:hidden">
        {s.profile.kyc_status !== 'approved' && <div className="mb-3"><Alert tone="warning" title="Identité à valider">Vous pourrez publier après la vérification (Profil › Identité).</Alert></div>}
        <LoanWizard />
      </div>
      <div className="hidden lg:block">
        <PageHeader title="Nouvelle demande de financement" subtitle="Validation hybride : contrôles automatiques puis, si nécessaire, examen humain." />
        {s.profile.kyc_status !== 'approved' && <div className="mb-4"><Alert tone="warning" title="KYC requis">Votre identité doit être validée avant de publier une demande.</Alert></div>}
        <Card><LoanRequestForm /></Card>
      </div>
    </>
  );
}
