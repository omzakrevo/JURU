'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, BadgeCheck, Bell, Check, FastForward, Package, Sparkles, TrendingUp } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { DEFAULT_FEE, quoteLoan } from '@/lib/loan';
import { formatFcfa } from '@/lib/money';

/** Nombre animé en boucle (4,8 s) tant que la slide est visible ; `steps` = paliers (ex. échéances qui se soldent). */
function Counter({ active, from, to, round = 1000, period = 4800, stepsAt }: { active: boolean; from: number; to: number; round?: number; period?: number; stepsAt?: number[] }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!active) { setV(from); return; }
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const k = ((t - t0) % period) / period;
      let e: number;
      if (stepsAt) { e = stepsAt.filter((x) => k >= x).length / stepsAt.length; }       // paliers : 1/3, 2/3, 3/3
      else e = k < 0.62 ? 1 - Math.pow(1 - k / 0.62, 3) : 1;                              // monte puis pause
      setV(Math.round((from + (to - from) * e) / round) * round);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to, round, period, stepsAt]);
  return <>{formatFcfa(v)}</>;
}

/* ---------- Slide 1 : « Besoin de 50 000 F pour votre activité ? » — un étal, un équipement manquant, la demande, les pièces, l'équipement arrive ---------- */
function Scene1({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="relative h-[176px]">
        <div className="absolute inset-x-3 top-0 h-12 rounded-t-[22px] shadow-lg" style={{ background: 'repeating-linear-gradient(90deg,#FF8A6B 0 26px,#FFF3E6 26px 52px)' }} />
        <div className="absolute inset-x-3 top-12 h-3 rounded-b-xl bg-black/20 blur-[2px]" />
        <div className="absolute left-5 top-12 h-[104px] w-1.5 rounded bg-white/25" /><div className="absolute right-5 top-12 h-[104px] w-1.5 rounded bg-white/25" />
        <div className="absolute inset-x-3 bottom-0 h-9 rounded-2xl bg-gradient-to-b from-[#2A8A5E] to-[#1B5A3D] shadow-inner ring-1 ring-white/15" />
        {/* emplacement de l'équipement : vide (pointillés) puis plein quand les pièces arrivent */}
        <div className="absolute left-1/2 top-[66px] -translate-x-1/2">
          <div className="ob-ghost relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-dashed border-white/50 text-white/60"><Package className="h-8 w-8" /><span className="ob-pulse absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F4C84A] text-sm font-black text-[#6B4E00]">?</span></div>
          <div className="ob-item absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#BFE8CF] to-[#5FAE85] text-[#0F3324] shadow-lg opacity-0"><Package className="h-9 w-9" /></div>
        </div>
        {[['calc(50% - 34px)', '0s'], ['50%', '.25s'], ['calc(50% + 34px)', '.5s']].map(([l, d]) => (
          <span key={l} className="ob-drop absolute top-[28px] -ml-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#F4C84A] text-xs font-black text-[#8A6500] shadow-md opacity-0" style={{ left: l, animationDelay: d }}>J</span>))}
      </div>
      <div className="ob-chip mt-3 flex items-center justify-between rounded-2xl bg-white p-3.5 text-[#0F1F18] shadow-[0_18px_34px_-14px_rgb(0_0_0/.6)]">
        <div><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#68756D]">Ma demande · équipement</p><p className="text-2xl font-black tabular-nums"><Counter active={active} from={0} to={50000} round={1000} period={6000} /></p></div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1F1E7] text-[#14452F]"><TrendingUp className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

/* ---------- Slide 2 : des prêteurs vérifiés répondent ; on compare le coût total (vrais calculs) ; on choisit le moins cher ---------- */
const OFFERS = ([['Fatimata', 1500, 'ob-in1', 'ob-dim'], ['Aminata', 1200, 'ob-in2', 'ob-pick'], ['Boukary', 1800, 'ob-in3', 'ob-dim']] as const).map(([n, bps, a, b]) => ({ n, bps, a, b, cost: quoteLoan(50000, bps, 3, DEFAULT_FEE).total_cost }));
function Scene2() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <p className="mb-2 text-center text-[11px] font-extrabold uppercase tracking-wide text-white/60">Offres pour 50 000 F · 3 mois</p>
      <div className="space-y-2.5">
        {OFFERS.map((o) => (
          <div key={o.n} className={o.a}>
            <div className={clsx(o.b, 'rounded-2xl')}>
              <div className="flex items-center gap-3 rounded-2xl bg-white p-3 text-[#0F1F18] shadow-[0_14px_26px_-14px_rgb(0_0_0/.6)]">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E1F1E7] text-base font-black text-[#14452F]">{o.n[0]}<BadgeCheck className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-[#2FBF71]" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{o.n}</span><span className="block text-[11px] font-semibold text-[#68756D]">Vérifié · {o.bps / 100} % par an</span></span>
                <span className="text-right"><span className="block text-[10px] font-bold text-[#68756D]">Coût total</span><span className="block text-sm font-black tabular-nums">{formatFcfa(o.cost)}</span></span>
              </div>
            </div>
          </div>))}
      </div>
      <div className="ob-late mt-3 flex items-center justify-center gap-2 rounded-full bg-[#2FBF71] px-4 py-2.5 text-xs font-extrabold text-[#08281A] opacity-0"><Check className="h-4 w-4" strokeWidth={3} />Coût total connu avant d’accepter</div>
    </div>
  );
}

/* ---------- Slide 3 : vendre, encaisser, rembourser par échéances ; rappels ; remboursement anticipé possible ---------- */
const Q3 = quoteLoan(50000, 1500, 3, DEFAULT_FEE);
const PAL = [0.28, 0.56, 0.86];
function Scene3({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-white/60">Reste à rembourser</p><span className="ob-pulse flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold"><TrendingUp className="h-3 w-3 text-[#BFE8CF]" />Vos ventes</span></div>
        <p className="mt-1 text-[32px] font-black leading-none tabular-nums"><Counter active={active} from={Q3.total_repayable} to={0} round={100} period={6000} stepsAt={PAL} /></p>
        <div className="relative mt-7 px-3">
          <div className="absolute inset-x-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15"><div className="ob-line h-full rounded-full bg-gradient-to-r from-[#2FBF71] to-[#F4C84A]" style={{ width: 0 }} /></div>
          <div className="relative flex justify-between">
            {([['ob-n1', 'Échéance 1'], ['ob-n2', 'Échéance 2'], ['ob-n3', 'Soldé']] as const).map(([c, l], i) => (
              <div key={c} className="flex w-16 flex-col items-center gap-1.5"><span className={clsx(c, 'flex h-9 w-9 items-center justify-center rounded-full text-[#08281A]')} style={{ backgroundColor: 'rgb(255 255 255 / .18)' }}><Check className="h-5 w-5" strokeWidth={3.2} /></span><span className="text-[10px] font-bold text-white/70">{i === 2 ? l : `${l}`}</span></div>))}
          </div>
        </div>
        <div className="relative mt-4 h-9">
          <div className="ob-bell absolute inset-x-0 flex items-center justify-center gap-2 rounded-full bg-[#BFE8CF] py-2 text-[11px] font-extrabold text-[#0F3324] opacity-0"><Bell className="ob-wiggle h-4 w-4" />Rappel avant l’échéance</div>
          <div className="ob-done absolute inset-x-0 flex items-center justify-center gap-2 rounded-full bg-[#F4C84A] py-2 text-[11px] font-extrabold text-[#5A3F00] opacity-0"><Sparkles className="h-4 w-4" />Crédit soldé — votre activité respire</div>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/70"><FastForward className="h-3.5 w-3.5 text-[#BFE8CF]" />Remboursement anticipé possible, sans intérêts futurs</p>
    </div>
  );
}

const SLIDES = [
  { key: 'besoin', eyebrow: 'Entrepreneurs, c’est pour vous', title: 'Besoin de 50 000 F pour votre activité ?', text: 'Un équipement à acheter, du stock à renouveler : dites ce qu’il vous faut en 2 minutes.' },
  { key: 'reponse', eyebrow: 'Des prêteurs vérifiés', title: 'Ils vous répondent, vous choisissez', text: 'Comparez les offres : le coût total est affiché avant d’accepter. Aucune mauvaise surprise.' },
  { key: 'rythme', eyebrow: 'À votre rythme', title: 'Vendez, encaissez, remboursez', text: 'Échéances claires, rappels avant chaque date, remboursement anticipé possible. Votre activité respire.' },
] as const;

/**
 * PREMIÈRE PAGE de l'application sur téléphone : présentation plein écran en 3 slides animées, affichée à CHAQUE ouverture
 * (retour arrière compris). Elle couvre tout l'écran ; « Continuer » ouvre ensuite l'accueil (inscription, connexion…).
 */
export function Onboarding({ loggedIn = false }: { loggedIn?: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [idx, setIdx] = useState(0);
  const [tap, setTap] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const rid = useRef(0);
  const dest = loggedIn ? '/app' : '/accueil';

  useEffect(() => { cta.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);

  const finish = useCallback(() => { setLeaving(true); window.setTimeout(() => router.push(dest), 380); }, [router, dest]);
  const go = (i: number) => { const el = scroller.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const onScroll = () => { const el = scroller.current; if (el) setIdx(Math.max(0, Math.min(SLIDES.length - 1, Math.round(el.scrollLeft / el.clientWidth)))); };
  const next = () => (idx < SLIDES.length - 1 ? go(idx + 1) : finish());
  const onPointerDown = (e: React.PointerEvent) => {
    const id = ++rid.current;
    setRipples((r) => [...r.slice(-3), { id, x: e.clientX, y: e.clientY }]);
    if ((e.target as HTMLElement).closest('[data-scene]')) setTap((t) => t + 1);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 900);
  };
  const last = idx === SLIDES.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Présentation de JURU" onPointerDown={onPointerDown}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft' && idx > 0) go(idx - 1); }}
      className={clsx('fixed inset-0 z-[100] flex h-dvh select-none flex-col overflow-hidden bg-gradient-to-b from-[#1B5A3D] via-[#12402C] to-[#0A261B] text-white transition-all duration-[380ms] lg:hidden', leaving && 'scale-105 opacity-0')}>
      <div className="drift pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#BFE8CF]/15 blur-3xl" />
      <div className="drift pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#F4C84A]/10 blur-3xl [animation-delay:-7s]" />
      {ripples.map((r) => <span key={r.id} className="ob-ripple" style={{ left: r.x, top: r.y }} />)}

      <div className="relative z-10 flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),20px)]">
        <span className="flex items-center gap-2 text-lg font-black tracking-tight"><LogoMark className="h-8 w-8" />JURU<span className="ml-1 rounded-full bg-[#F4C84A] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#4A3B00]">Démo</span></span>
        <button type="button" onClick={finish} className="rounded-full px-3 py-2 text-sm font-bold text-white/75 hover:text-white">Passer</button>
      </div>

      <div ref={scroller} onScroll={onScroll} className="no-scrollbar relative z-10 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto" aria-live="polite">
        {SLIDES.map((s, i) => (
          <section key={s.key} aria-label={`${i + 1} sur ${SLIDES.length}`} className={clsx('flex h-full w-full shrink-0 snap-center flex-col px-7', idx === i && 'play')}>
            <div data-scene key={idx === i ? tap : 0} className={clsx('flex flex-1 items-center justify-center py-3', idx === i && tap > 0 && 'ob-tap')}>
              {i === 0 && <Scene1 active={idx === 0} />}{i === 1 && <Scene2 />}{i === 2 && <Scene3 active={idx === 2} />}
            </div>
            <div className={clsx('pb-3', idx === i && 'ob-rise')} key={`t-${idx === i}`}>
              <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#BFE8CF]">{s.eyebrow}</p>
              <h1 className="text-[30px] font-black leading-[1.05] tracking-tight">{s.title}</h1>
              <p className="mt-2.5 text-[15px] leading-snug text-white/75">{s.text}</p>
            </div>
          </section>))}
      </div>

      <div className="relative z-10 px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2" role="tablist" aria-label="Diapositives">
            {SLIDES.map((s, i) => <button key={s.key} role="tab" aria-selected={idx === i} aria-label={`Diapositive ${i + 1}`} onClick={() => go(i)} className={clsx('h-2 rounded-full transition-all duration-300', idx === i ? 'w-8 bg-white' : 'w-2 bg-white/30')} />)}
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-white/55"><Sparkles className="h-3 w-3" />Touchez l’écran</span>
        </div>
        <button ref={cta} type="button" onClick={next} className="ob-glow flex w-full items-center justify-center gap-2 rounded-full bg-[#F7F4EA] py-4 text-base font-extrabold text-[#0F3324] shadow-[0_14px_28px_-14px_rgb(0_0_0/.6)] active:scale-[.98]">
          {last ? (loggedIn ? 'Ouvrir mon espace' : 'Commencer') : 'Continuer'} <ArrowRight className="h-5 w-5" strokeWidth={2.8} />
        </button>
        {last && !loggedIn && <Link href="/connexion" className="mt-3 block text-center text-sm font-bold text-white/75">J’ai déjà un compte</Link>}
      </div>
    </div>
  );
}
