'use client';
import { useRef, useState } from 'react';
import clsx from 'clsx';

/** Code SMS en 6 cases : saisie guidée, collage, retour arrière, envoi automatique à la dernière case. */
export function OtpInput({ length = 6, name = 'token' }: { length?: number; name?: string }) {
  const [d, setD] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const submit = (v: string[]) => { if (v.every(Boolean)) refs.current[0]?.closest('form')?.requestSubmit(); };
  const set = (i: number, val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) { const n = [...d]; n[i] = ''; setD(n); return; }
    const n = [...d];
    digits.slice(0, length - i).split('').forEach((c, k) => { n[i + k] = c; });          // couvre aussi le collage complet
    setD(n);
    refs.current[Math.min(i + digits.length, length - 1)]?.focus();
    submit(n);
  };
  return (
    <div>
      <input type="hidden" name={name} value={d.join('')} />
      <div className="flex justify-between gap-2" role="group" aria-label="Code de vérification">
        {d.map((v, i) => (
          <div key={i} className={clsx('field-lg !h-[68px] flex-1 !px-0 justify-center', v && 'ob-pop-once')}>
            <input ref={(el) => { refs.current[i] = el; }} value={v} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={length} aria-label={`Chiffre ${i + 1}`}
              onChange={(e) => set(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !d[i] && i > 0) { refs.current[i - 1]?.focus(); } }}
              onFocus={(e) => e.target.select()} className="!text-center !text-[28px] !font-semibold" />
          </div>))}
      </div>
    </div>
  );
}
