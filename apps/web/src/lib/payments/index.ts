import type { PaymentGateway, Provider } from './gateway';
import { MoovMoneyGateway } from './moov-money';
import { OrangeMoneyGateway } from './orange-money';
import { SimulationGateway } from './simulation';

/** Fabrique : en l'absence de paiements réels activés, TOUJOURS la simulation. */
export function getGateway(provider: Provider = 'simulation', liveEnabled = false): PaymentGateway {
  if (!liveEnabled || provider === 'simulation') return new SimulationGateway();
  if (provider === 'orange_money') return new OrangeMoneyGateway();
  return new MoovMoneyGateway();
}
export * from './gateway';
