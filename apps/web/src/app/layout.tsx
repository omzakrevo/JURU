import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'JURU — Le financement, en toute confiance', template: '%s · JURU' },
  description: 'JURU : le financement rapide pour les entrepreneurs du Burkina Faso. De 5 000 à 500 000 FCFA pour un équipement, du stock ou une commande, avec un coût total toujours affiché. Plateforme de mise en relation, non établissement financier.',
  applicationName: 'JURU',
  robots: { index: true, follow: true },
};
export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#F7F5EF' }, { media: '(prefers-color-scheme: dark)', color: '#081022' }],
  width: 'device-width', initialScale: 1,
};

// Applique le thème avant l'hydratation (pas de flash)
const themeScript = `try{var t=localStorage.getItem('juru-theme');if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)t='dark';document.documentElement.dataset.theme=t||'light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
