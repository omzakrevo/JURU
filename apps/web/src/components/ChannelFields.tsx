'use client';
import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui';

/** Choix du moyen Mobile Money + OTP pré-paiement (exigé par Orange Money Burkina). */
export function ChannelFields({ defaultChannel }: { defaultChannel?: string | null }) {
  const [ch, setCh] = useState(defaultChannel ?? 'orange_money');
  return (
    <>
      <Field label="Moyen de paiement" htmlFor="channel"><Select id="channel" name="channel" value={ch} onChange={(e) => setCh(e.target.value)}><option value="orange_money">Orange Money</option><option value="moov_money">Moov Money</option></Select></Field>
      {ch === 'orange_money' && <Field label="Code de paiement Orange Money (OTP)" htmlFor="otp" help="Orange Money Burkina exige un code généré par le client avant de payer, selon les instructions de l’opérateur. Laissez vide si on ne vous le demande pas."><Input id="otp" name="otp" inputMode="numeric" autoComplete="off" /></Field>}
    </>
  );
}
