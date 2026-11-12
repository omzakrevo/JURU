'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, BadgeCheck, Bell, Check, Coins, HandCoins, ShieldCheck, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { formatFcfa } from '@/lib/money';

const KEY = 'juru-onboarded';

/** Nombre qui monte puis recommence, tant que la slide est visible. */
function CountUp({ active, from = 5000, to = 150000 }: { active: boolean; from?: number; to?: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!active) { setV(from); return; }
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const k = ((t - t0) % 4800) / 4800;                       // 0 → 1 sur 4,8 s
      const e = k < 0.7 ? 1 - Math.pow(1 - k / 0.7, 3) : 1;     // monte (easing) puis marque une pause
      setV(Math.round((from + (to - from) * e) / 5000) * 5000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to]);
  return <>{formatFcfa(v)}</>;
}

/* ---------- Slide 1 : demander / proposer un financement ---------- */
function Scene1({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="relative rounded-[28px] bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/15">
        <p className="text-xs font-bold uppercase tracking-wide text-white/60">Montant souhaité</p>
        <p className="mt-1 text-[34px] font-black leading-none tabular-nums"><CountUp active={active} /></p>
        <div className="relative mt-5 h-2.5 rounded-full bg-white/15">
          <div className="ob-bar absolute inset-y-0 left-0 rounded-full bg-[#BFE8CF]" style={{ width: '6%' }} />
          <div className="ob-thumb absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2 rounded-full border-[3px] border-white bg-[#2FBF71] shadow-lg" style={{ left: '6%' }} />
        </div>
        <div className="mt-5 flex gap-2 text-xs font-extrabold">
          <span className="ob-pulse flex-1 rounded-full bg-[#BFE8CF] py-2 text-center text-[#0F3324]">Emprunter</span>
          <span className="ob-pulse flex-1 rounded-full bg-white/15 py-2 text-center [animation-delay:1.2s]">Prêter</span>
        </div>
      </div>
      {/* pièces qui s'envolent */}
      {[['12%', '0s', 24], ['44%', '1s', 30], ['74%', '2s', 22]].map(([l, d, sz]) => (
        <span key={String(l)} className="ob-float pointer-events-none absolute -top-2 flex items-center justify-center rounded-full bg-[#F4C84A] font-black text-[#8A6500] shadow-md" style={{ left: String(l), animationDelay: String(d), width: Number(sz), height: Number(sz), fontSize: Number(sz) * 0.5 }}>J</span>))}
      <div className="mt-4 flex justify-center gap-2 text-[11px] font-extrabold">
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[#BFE8CF]" />Identité vérifiée</span>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#BFE8CF]" />5 000 – 500 000 F</span>
      </div>
    </div>
  );
}

/* ---------- Slide 2 : mise en relation et comparaison ---------- */
function Scene2() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 300 210" className="w-full" aria-hidden="true">
        <path className="ob-draw" style={{ ['--len' as string]: 170 }} d="M62 110 C 110 40, 190 40, 238 110" fill="none" stroke="#BFE8CF" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 9" />
        <g className="ob-pulse" style={{ transformOrigin: '62px 120px' }}><circle cx="62" cy="120" r="34" fill="#FF8A6B" /><text x="62" y="132" textAnchor="middle" fontSize="32" fontWeight="900" fill="#fff" fontFamily="Inter, sans-serif">A</text></g>
        <g className="ob-pulse" style={{ transformOrigin: '238px 120px', animationDelay: '1.2s' }}><circle cx="238" cy="120" r="34" fill="#F4C84A" /><text x="238" y="132" textAnchor="middle" fontSize="32" fontWeight="900" fill="#6B4E00" fontFamily="Inter, sans-serif">F</text></g>
        <g className="ob-pop" style={{ transformOrigin: '150px 62px' }}><circle cx="150" cy="62" r="22" fill="#2FBF71" /><path d="M139 62 l8 8 l15 -17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
      </svg>
      <div className="ob-slide-in -mt-6 rounded-3xl bg-white p-4 text-[#0F1F18] shadow-[0_18px_34px_-14px_rgb(0_0_0/.6)]">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#68756D]">Proposition reçue</p>
        <div className="mt-1 flex items-end justify-between"><p className="text-2xl font-black">150 000 F</p><p className="text-xs font-bold text-[#68756D]">6 mois · 18 %</p></div>
        <div className="mt-2 flex gap-1.5 text-[11px] font-extrabold"><span className="rounded-full bg-[#E1F1E7] px-2.5 py-1 text-[#14452F]">Coût total 10 972 F</span><span className="rounded-full bg-[#E1F1E7] px-2.5 py-1 text-[#14452F]">TAEG 28,3 %</span></div>
      </div>
    </div>
  );
}

/* ---------- Slide 3 : contrat signé et remboursement suivi ---------- */
function Scene3() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="rounded-[28px] bg-white p-5 text-[#0F1F18] shadow-[0_22px_40px_-18px_rgb(0,0,0,.6)]">
        <div className="flex items-center justify-between"><p className="text-sm font-extrabold">Contrat n°7</p><span className="rounded-full bg-[#E1F1E7] px-2.5 py-1 text-[10px] font-extrabold text-[#14452F]">Signé</span></div>
        <div className="mt-3 space-y-1.5"><div className="h-2 rounded-full bg-[#E9E6DA]" /><div className="h-2 w-5/6 rounded-full bg-[#E9E6DA]" /><div className="h-2 w-2/3 rounded-full bg-[#E9E6DA]" /></div>
        <svg viewBox="0 0 220 56" className="mt-2 h-14 w-full" aria-hidden="true"><path className="ob-draw" style={{ ['--len' as string]: 330 }} d="M8 40 C 22 8, 36 8, 40 30 S 58 50, 70 24 S 92 10, 100 32 S 126 48, 140 22 L 150 34 L 212 20" fill="none" stroke="#14452F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <p className="-mt-1 text-[11px] font-bold text-[#68756D]">Signature électronique</p>
        <div className="mt-4 flex items-center justify-between text-xs font-extrabold"><span>Remboursement</span><span className="text-[#14452F]">Suivi en direct</span></div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#E9E6DA]"><div className="ob-fill h-full rounded-full bg-[#2FBF71]" style={{ width: '0%' }} /></div>
      </div>
      <div className="ob-slide-in absolute -bottom-5 -right-2 flex items-center gap-2 rounded-2xl bg-[#BFE8CF] px-3 py-2.5 text-xs font-extrabold text-[#0F3324] shadow-lg"><Bell className="ob-wiggle h-4 w-4" />Échéance dans 3 jours</div>
    </div>
  );
}

const SLIDES = [
  { key: 'demander', title: 'Demandez ou proposez un financement', text: 'Empruntez de 5 000 à 500 000 FCFA, ou prêtez à vos conditions. Chacun est vérifié, pour la sécurité de tous.', icon: HandCoins },
  { key: 'comparer', title: 'Comparez en toute clarté', text: 'Chaque proposition affiche le coût total, le TAEG et l’échéancier. Vous choisissez, puis vous acceptez. Aucune commission cachée.', icon: Coins },
  { key: 'suivre', title: 'Signez et suivez', text: 'Contrat clair signé en ligne, rappels avant chaque échéance, remboursement partiel ou anticipé quand vous voulez.', icon: Check },
] as const;

/**
 * Présentation plein écran (téléphone) : 3 slides animées qui expliquent le parcours. Couvre TOUT l'écran
 * (ni en-tête ni barre du bas). « Continuer » la termine et révèle le site (inscription, connexion…). Affichée à la 1re visite.
 */
export function Onboarding() {
  const [state, setState] = useState<'checking' | 'show' | 'leaving' | 'hidden'>('checking');
  const [idx, setIdx] = useState(0);
  const [tap, setTap] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const rid = useRef(0);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === '1'; } catch { /* stockage indisponible : on affiche la présentation */ }
    setState(seen ? 'hidden' : 'show');
  }, []);
  useEffect(() => { if (state === 'show') cta.current?.focus({ preventScroll: true }); }, [state]);
  useEffect(() => {
    if (state === 'show') { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }
  }, [state]);

  const finish = useCallback(() => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignoré */ }
    setState('leaving');
    window.setTimeout(() => setState('hidden'), 450);
  }, []);
  const go = (i: number) => { const el = scroller.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const onScroll = () => { const el = scroller.current; if (el) setIdx(Math.max(0, Math.min(SLIDES.length - 1, Math.round(el.scrollLeft / el.clientWidth)))); };
  const next = () => (idx < SLIDES.length - 1 ? go(idx + 1) : finish());
  const onPointerDown = (e: React.PointerEvent) => {
    const id = ++rid.current;
    setRipples((r) => [...r.slice(-3), { id, x: e.clientX, y: e.clientY }]);
    if ((e.target as HTMLElement).closest('[data-scene]')) { setTap((t) => t + 1); }
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 900);
  };

  if (state === 'hidden') return null;
  const last = idx === SLIDES.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Présentation de JURU" onPointerDown={onPointerDown}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft' && idx > 0) go(idx - 1); if (e.key === 'Escape') finish(); }}
      className={clsx('fixed inset-0 z-[100] flex h-dvh select-none flex-col overflow-hidden bg-gradient-to-b from-[#1B5A3D] via-[#12402C] to-[#0A261B] text-white transition-all duration-[450ms] lg:hidden', state === 'leaving' && 'scale-105 opacity-0')}>
      <div className="drift pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#BFE8CF]/15 blur-3xl" />
      <div className="drift pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#F4C84A]/10 blur-3xl [animation-delay:-7s]" />
      {ripples.map((r) => <span key={r.id} className="ob-ripple" style={{ left: r.x, top: r.y }} />)}

      {state === 'checking' ? (
        <div className="flex flex-1 items-center justify-center"><div className="breathe"><LogoMark className="h-16 w-16" /></div></div>
      ) : (
        <>
          <div className="relative z-10 flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),20px)]">
            <span className="flex items-center gap-2 text-lg font-black tracking-tight"><LogoMark className="h-8 w-8" />JURU</span>
            <button type="button" onClick={finish} className="rounded-full px-3 py-2 text-sm font-bold text-white/75 hover:text-white">Passer</button>
          </div>

          <div ref={scroller} onScroll={onScroll} className="no-scrollbar relative z-10 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto" aria-live="polite">
            {SLIDES.map((s, i) => (
              <section key={s.key} aria-label={`${i + 1} sur ${SLIDES.length}`} className={clsx('flex h-full w-full shrink-0 snap-center flex-col px-7', idx === i && 'play')}>
                <div data-scene key={idx === i ? tap : 0} className={clsx('flex flex-1 items-center justify-center py-4', idx === i && tap > 0 && 'ob-tap')}>
                  {i === 0 && <Scene1 active={idx === 0} />}{i === 1 && <Scene2 />}{i === 2 && <Scene3 />}
                </div>
                <div className={clsx('pb-3', idx === i && 'ob-rise')} key={`t-${idx === i}`}>
                  <h1 className="text-[30px] font-black leading-[1.05] tracking-tight">{s.title}</h1>
                  <p className="mt-3 text-[15px] leading-snug text-white/75">{s.text}</p>
                </div>
              </section>))}
          </div>

          <div className="relative z-10 px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2" role="tablist" aria-label="Diapositives">
                {SLIDES.map((s, i) => <button key={s.key} role="tab" aria-selected={idx === i} aria-label={`Diapositive ${i + 1}`} onClick={() => go(i)} className={clsx('h-2 rounded-full transition-all duration-300', idx === i ? 'w-8 bg-white' : 'w-2 bg-white/30')} />)}
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-white/55"><Sparkles className="h-3 w-3" />Touchez l’écran</span>
            </div>
            <button ref={cta} type="button" onClick={next} className="ob-glow flex w-full items-center justify-center gap-2 rounded-full bg-[#F7F4EA] py-4 text-base font-extrabold text-[#0F3324] shadow-[0_14px_28px_-14px_rgb(0_0_0/.6)] active:scale-[.98]">
              {last ? 'Commencer' : 'Continuer'} <ArrowRight className="h-5 w-5" strokeWidth={2.8} />
            </button>
            {last && <Link href="/connexion" onClick={() => { try { localStorage.setItem(KEY, '1'); } catch { /* ignoré */ } }} className="mt-3 block text-center text-sm font-bold text-white/75">J’ai déjà un compte</Link>}
          </div>
        </>
      )}
    </div>
  );
}
