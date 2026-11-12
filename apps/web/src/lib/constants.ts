export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const PURPOSES: Record<string, string> = {
  commerce: 'Commerce', agriculture: 'Agriculture', education: 'Éducation', health: 'Santé', housing: 'Logement',
  equipment: 'Équipement', emergency: 'Urgence', transport: 'Transport', other: 'Autre',
};

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  // KYC
  not_started: { label: 'Non commencé', tone: 'neutral' }, pending: { label: 'En attente', tone: 'warning' },
  approved: { label: 'Validé', tone: 'success' }, rejected: { label: 'Refusé', tone: 'danger' },
  more_info_required: { label: 'Complément demandé', tone: 'info' },
  // Demandes / offres
  draft: { label: 'Brouillon', tone: 'neutral' }, pending_review: { label: 'En examen', tone: 'warning' },
  open: { label: 'Ouverte', tone: 'success' }, in_negotiation: { label: 'En négociation', tone: 'info' },
  accepted: { label: 'Acceptée', tone: 'success' }, cancelled: { label: 'Annulée', tone: 'neutral' },
  expired: { label: 'Expirée', tone: 'neutral' }, active: { label: 'Active', tone: 'success' },
  paused: { label: 'En pause', tone: 'neutral' }, exhausted: { label: 'Épuisée', tone: 'neutral' }, closed: { label: 'Clôturée', tone: 'neutral' },
  // Propositions
  proposed: { label: 'Proposée', tone: 'info' }, withdrawn: { label: 'Retirée', tone: 'neutral' },
  // Contrats
  pending_signature: { label: 'À signer', tone: 'warning' }, partially_signed: { label: 'Partiellement signé', tone: 'info' },
  signed: { label: 'Signé', tone: 'success' },
  // Crédits
  awaiting_disbursement: { label: 'Décaissement en attente', tone: 'warning' }, overdue: { label: 'En retard', tone: 'danger' },
  repaid: { label: 'Remboursé', tone: 'success' }, defaulted: { label: 'En défaut', tone: 'danger' }, in_dispute: { label: 'En litige', tone: 'warning' },
  // Échéances / paiements
  paid: { label: 'Payée', tone: 'success' }, partial: { label: 'Partielle', tone: 'info' },
  initiated: { label: 'Initiée', tone: 'neutral' }, succeeded: { label: 'Réussie', tone: 'success' }, failed: { label: 'Échouée', tone: 'danger' },
  reversed: { label: 'Annulée', tone: 'neutral' }, pending_approval: { label: 'Validation requise', tone: 'warning' },
  // Litiges, validations
  open_dispute: { label: 'Ouvert', tone: 'warning' }, investigating: { label: 'En instruction', tone: 'info' }, resolved: { label: 'Résolu', tone: 'success' },
  escalated: { label: 'Escaladé', tone: 'danger' }, executed: { label: 'Exécutée', tone: 'success' },
  suspended: { label: 'Suspendu', tone: 'danger' },
  prospect: { label: 'Prospect', tone: 'neutral' }, contract_signed: { label: 'Contrat signé', tone: 'info' },
};

export const statusInfo = (s: string | null | undefined) =>
  STATUS[s ?? ''] ?? { label: s ?? '—', tone: 'neutral' as Tone };

export const GUARANTEE_LABELS: Record<string, string> = {
  none: 'Aucune', guarantor: 'Garant', collateral: 'Nantissement', savings_pledge: 'Épargne mise en gage',
};

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
export const APP_NAME = 'JURU';
export const SLOGAN = 'Le financement, en toute confiance.';
