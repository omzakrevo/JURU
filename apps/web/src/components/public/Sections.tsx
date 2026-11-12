import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';

export function Hero({ eyebrow, title, text, cta }: { eyebrow?: string; title: string; text?: string; cta?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_90%_0%,rgb(var(--accent)/.14),transparent)]" />
      <div className="container-x py-6 sm:py-14 lg:py-20">
        {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
        <h1 className="max-w-3xl text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
        {text && <p className="mt-2 max-w-2xl text-sm text-muted sm:mt-4 sm:text-lg">{text}</p>}
        {cta && <div className="mt-4 flex flex-wrap gap-3 sm:mt-7">{cta}</div>}
      </div>
    </section>
  );
}
export const Section = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <section className={`container-x py-4 lg:py-12 ${className}`}>{children}</section>;

export function CtaBand({ title, text, href, label }: { title: string; text: string; href: string; label: string }) {
  return (
    <section className="container-x py-4 lg:py-10">
      <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-br from-[#2B3C9C] to-[#0F1B4C] p-6 text-white sm:flex-row lg:p-8 sm:items-center">
        <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-white/80">{text}</p></div>
        <ButtonLink href={href} variant="accent" size="lg">{label}</ButtonLink>
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="container-x max-w-3xl py-5 lg:py-12 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-fg/90 [&_ul]:mt-3 [&_ul]:space-y-1.5">{children}</div>;
}
