export type AppRole =
  | 'super_admin' | 'compliance_officer' | 'credit_agent' | 'finance_manager'
  | 'accountant' | 'support' | 'auditor' | 'user' | 'partner';

export const STAFF_ROLES: AppRole[] = [
  'super_admin', 'compliance_officer', 'credit_agent', 'finance_manager', 'accountant', 'support', 'auditor',
];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super administrateur', compliance_officer: 'Responsable conformité', credit_agent: 'Agent crédit',
  finance_manager: 'Responsable financier', accountant: 'Comptable', support: 'Support', auditor: 'Auditeur',
  user: 'Utilisateur', partner: 'Partenaire',
};

/** Sections de l'administration visibles par rôle (l'autorisation réelle reste appliquée par RLS/RPC). */
export const ADMIN_SECTIONS: Record<string, AppRole[]> = {
  dashboard: STAFF_ROLES,
  kyc: ['super_admin', 'compliance_officer', 'auditor'],
  demandes: ['super_admin', 'credit_agent', 'compliance_officer', 'auditor', 'support'],
  offres: ['super_admin', 'credit_agent', 'compliance_officer', 'auditor', 'support'],
  credits: ['super_admin', 'credit_agent', 'finance_manager', 'compliance_officer', 'auditor', 'support', 'accountant'],
  validations: ['super_admin', 'finance_manager', 'compliance_officer', 'auditor'],
  transactions: ['super_admin', 'finance_manager', 'accountant', 'auditor', 'support'],
  ledger: ['super_admin', 'finance_manager', 'accountant', 'auditor'],
  litiges: ['super_admin', 'support', 'compliance_officer', 'auditor'],
  utilisateurs: ['super_admin', 'support', 'compliance_officer', 'credit_agent', 'finance_manager', 'auditor'],
  partenaires: STAFF_ROLES,
  pays: ['super_admin', 'compliance_officer', 'auditor', 'finance_manager'],
  audit: ['super_admin', 'compliance_officer', 'auditor'],
  rapports: ['super_admin', 'finance_manager', 'accountant', 'auditor', 'compliance_officer'],
};

export const canSee = (roles: AppRole[], section: string) =>
  (ADMIN_SECTIONS[section] ?? []).some((r) => roles.includes(r));
