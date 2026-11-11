'use client';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('kredia-theme', next ? 'dark' : 'light'); } catch { /* stockage indisponible */ }
  };
  return (
    <button onClick={toggle} aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'} title="Thème"
      className="rounded-full p-2 text-fg transition hover:bg-surface-2">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
