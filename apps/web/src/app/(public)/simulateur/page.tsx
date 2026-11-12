import type { Metadata } from 'next';
import { Simulator } from '@/components/public/Simulator';

export const metadata: Metadata = { title: 'Simulateur', description: 'Estimez la mensualité, le coût total et le TAEG de votre financement.' };
export default function Page() {
  return (
    <div className="container-x py-3 lg:py-12">
      <h1 className="mb-3 text-xl font-extrabold lg:mb-5 lg:text-3xl">Simulez votre financement</h1>
      <Simulator compact />
    </div>
  );
}
