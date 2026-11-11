import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';

export function Hero({ eyebrow, title, text, cta }: { eyebrow?: string; title: string; text?: string; cta?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_90%_0%,rgb(var(--accent)/.14),transparent)]" />
      <div className="container-x py-14 sm:py-20">
        {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-lg text-muted">{text}</p>}
        {cta && <div className="mt-7 flex flex-wrap gap-3">{cta}</div>}
      </div>
    </section>
  );
}
export const Section = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <section className={`container-x py-12 ${className}`}>{children}</section>;

export function CtaBand({ title, text, href, label }: { title: string; text: string; href: string; label: string }) {
  return (
    <section className="container-x py-10">
      <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-primary p-8 text-primary-fg sm:flex-row sm:items-center">
        <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-primary-fg/80">{text}</p></div>
        <ButtonLink href={href} variant="accent" size="lg">{label}</ButtonLink>
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="container-x max-w-3xl py-12 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-fg/90 [&_ul]:mt-3 [&_ul]:space-y-1.5">{children}</div>;
}
