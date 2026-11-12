'use client';
import { useRouter } from 'next/navigation';
import { PlayCircle } from 'lucide-react';

/** Réaffiche la présentation d'accueil (efface le « déjà vu » local). */
export function ReplayIntro() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => { try { localStorage.removeItem('juru-onboarded'); } catch { /* ignoré */ } router.push('/'); router.refresh(); }}
      className="tile tile-sky aspect-[4/3] col-span-2 flex-row items-center justify-start gap-3 sm:col-span-1" aria-label="Revoir la présentation">
      <PlayCircle className="h-7 w-7" strokeWidth={2.2} /><span className="text-base font-extrabold leading-tight">Revoir la présentation</span>
    </button>
  );
}
