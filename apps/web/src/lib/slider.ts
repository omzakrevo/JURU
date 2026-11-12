import type { CSSProperties } from 'react';

/** Remplit la partie « parcourue » d'un curseur (input range) pour qu'il soit lisible. */
export const sliderStyle = (value: number, min: number, max: number): CSSProperties => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return { background: `linear-gradient(90deg, #14452F ${pct}%, #DAD7CA ${pct}%)` };
};
