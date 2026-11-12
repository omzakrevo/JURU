import { Alert, Card, PageHeader } from '@/components/ui';
import { OfferForm } from '@/components/LoanForms';
import { OfferWizard } from '@/components/OfferWizard';
import { requireSession } from '@/lib/session';

export default async function Page() {
  const s = await requireSession();
  const blocked = !s.profile.is_lender || s.profile.kyc_status !== 'approved';
  return (
    <>
      <div className="flex min-h-full flex-1 flex-col lg:hidden">
        {blocked && <div className="mb-3"><Alert tone="warning" title="Avant de publier">Activez « Je peux prêter » (avec l’origine des fonds) dans votre profil et faites valider votre identité.</Alert></div>}
        <OfferWizard />
      </div>
      <div className="hidden lg:block">
        <PageHeader title="Nouvelle offre de financement" subtitle="Vous fixez vos conditions ; les emprunteurs voient le coût total avant d’accepter." />
        {blocked && <div className="mb-4"><Alert tone="warning" title="Prérequis">Activez le profil prêteur (avec l’origine des fonds) dans votre profil et faites valider votre identité.</Alert></div>}
        <Alert tone="info" title="Risque">Prêter comporte un risque de perte en capital. JURU ne garantit pas les remboursements.</Alert>
        <Card className="mt-4"><OfferForm /></Card>
      </div>
    </>
  );
}
