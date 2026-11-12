import type { PaymentGateway, Provider } from './gateway';
import { SasPayGateway } from './sas-pay';
import { SimulationGateway } from './simulation';

/** Fabrique : en l'absence de paiements réels activés, TOUJOURS la simulation. */
export function getGateway(provider: Provider = 'simulation', liveEnabled = false): PaymentGateway {
  if (!liveEnabled || provider === 'simulation') return new SimulationGateway();
  return new SasPayGateway();
}
export * from './gateway';
