import type { PaymentGateway, Provider } from './gateway';
import { SasPayGateway } from './sas-pay';
import { SimulationGateway } from './simulation';

/** Fabrique : en l'absence de paiements réels activés, TOUJOURS la simulation. */
export function getGateway(provider: Provider = 'simulation', liveEnabled = false): PaymentGateway {
  if (!liveEnabled || provider === 'simulation') return new SimulationGateway();
  // Paiements réels activés pour le pays => clé live autorisée (jamais avant).
  return new SasPayGateway({ allowLive: true });
}
export * from './gateway';
