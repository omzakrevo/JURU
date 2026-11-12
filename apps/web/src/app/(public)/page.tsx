import { ArrowRight, BadgeCheck, FileSignature, HandCoins, Lock, ScanFace, Search, ShieldCheck, Smartphone, Users } from 'lucide-react';
import { ButtonLink, Card } from '@/components/ui';
import { Simulator } from '@/components/public/Simulator';
import { getSession } from '@/lib/session';
import { Onboarding } from '@/components/public/Onboarding';

const steps = [
  { icon: ScanFace, t: '1. Vérifiez votre identité', d: 'Inscription par téléphone et code OTP, puis KYC : pièce d’identité et selfie, examinés avec soin.' },
  { icon: Search, t: '2. Publiez ou choisissez', d: 'Emprunteur : décrivez votre besoin. Prêteur : publiez une offre. Le matching propose les meilleures correspondances.' },
  { icon: FileSignature, t: '3. Signez en toute clarté', d: 'Coût total, échéancier et TAEG affichés avant acceptation. Contrat PDF et signature électronique.' },
  { icon: HandCoins, t: '4. Suivez et remboursez', d: 'Échéances, rappels, remboursement partiel ou anticipé. Tout est tracé, rien n’est caché.' },
];

export default async function HomePage() {
  const session = await getSession();
  return (
    <>
      <Onboarding loggedIn={Boolean(session)} />
      <div className="hidden lg:block">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_80%_0%,rgb(var(--accent)/.18),transparent),radial-gradient(60%_50%_at_0%_20%,rgb(var(--primary)/.14),transparent)]" />
        <div className="container-x grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_.85fr]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="h-4 w-4" /> Pour les entrepreneurs · Burkina Faso · bientôt UEMOA
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Le financement,<br /><span className="text-primary">en toute confiance.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Besoin de 50&nbsp;000&nbsp;FCFA pour un équipement, du stock ou une commande à honorer ? JURU vous met en relation avec des prêteurs vérifiés.
              De 5&nbsp;000 à 500&nbsp;000&nbsp;FCFA, un coût total toujours affiché, jamais de commission cachée.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/inscription" size="lg">Créer mon compte <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/comment-ca-marche" size="lg" variant="outline">Comment ça marche</ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {['KYC obligatoire', 'Contrat transparent', 'Données protégées'].map((t) => <li key={t} className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent" />{t}</li>)}
            </ul>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <Card className="relative overflow-hidden bg-night text-white !border-white/10">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
              <p className="text-sm text-white/60">Exemple de proposition</p>
              <p className="mt-1 text-3xl font-extrabold">150&nbsp;000 FCFA</p>
              <p className="text-sm text-white/70">sur 6 mois · 18 % par an</p>
              <dl className="mt-5 space-y-2 text-sm">
                {[['Mensualité', '24 079 + 2 250 …'], ['Commission unique', '3 000 FCFA'], ['Coût total du crédit', '10 972 FCFA'], ['TAEG', '28,27 %']].map(([k, v]) => <div key={k} className="flex justify-between border-b border-white/10 pb-1.5"><dt className="text-white/60">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              </dl>
              <p className="mt-4 text-[11px] text-white/50">Illustration — mode démonstration, aucun fonds réel.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-x py-14">
        <h2 className="text-center text-3xl font-bold tracking-tight">Simple, clair, vérifié</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.t} className="transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="inline-flex rounded-xl bg-primary-soft p-2.5 text-primary"><s.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-6 max-w-2xl"><h2 className="text-3xl font-bold tracking-tight">Simulez votre financement</h2>
          <p className="mt-2 text-muted">Échéancier, coût total et TAEG calculés exactement comme sur la plateforme.</p></div>
        <Simulator />
      </section>

      <section className="container-x grid gap-4 py-14 md:grid-cols-2">
        <Card className="bg-primary text-primary-fg !border-transparent">
          <Users className="h-7 w-7" /><h3 className="mt-4 text-2xl font-bold">Je cherche un financement</h3>
          <p className="mt-2 text-primary-fg/80">Décrivez votre besoin, comparez les propositions de prêteurs vérifiés et choisissez en connaissance de cause.</p>
          <ButtonLink href="/emprunter" variant="accent" className="mt-5">Découvrir « Emprunter »</ButtonLink>
        </Card>
        <Card>
          <HandCoins className="h-7 w-7 text-primary" /><h3 className="mt-4 text-2xl font-bold">Je souhaite prêter</h3>
          <p className="mt-2 text-muted">Publiez une offre aux conditions que vous choisissez, consultez les demandes compatibles et suivez vos remboursements.</p>
          <ButtonLink href="/preter" variant="outline" className="mt-5">Découvrir « Prêter »</ButtonLink>
        </Card>
      </section>

      <section className="container-x py-6">
        <div className="grid gap-4 rounded-3xl bg-night p-8 text-white md:grid-cols-3">
          {[{ i: Lock, t: 'Données chiffrées', d: 'Documents KYC en stockage privé, accès strictement contrôlé et journalisé.' },
            { i: Smartphone, t: 'Mobile Money (à venir)', d: 'Orange Money et Moov Money, uniquement après contractualisation et accès aux API officielles.' },
            { i: ShieldCheck, t: 'Partenaires réglementés', d: 'JURU n’est pas une banque : les fonds transitent par des partenaires autorisés.' }].map((x) => (
            <div key={x.t}><x.i className="h-6 w-6 text-accent" /><h3 className="mt-3 font-semibold">{x.t}</h3><p className="mt-1 text-sm text-white/70">{x.d}</p></div>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
