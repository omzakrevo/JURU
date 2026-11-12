export interface LoanRequest {
  id: string; borrower_id: string; country_code: string; amount: number; purpose: string; purpose_details: string | null;
  duration_months: number; max_annual_rate_bps: number; monthly_income: number; monthly_expenses: number;
  existing_debt_monthly: number; repayment_capacity: number; status: string; risk_score: number | null;
  auto_review: { score?: number; reasons?: string[]; estimated_installment?: number } | null;
  rejection_reason: string | null; published_at: string | null; expires_at: string | null; created_at: string;
}
export interface FundingOffer {
  id: string; lender_id: string; title: string; amount_available: number; initial_amount: number; min_amount: number;
  max_amount: number; min_duration_months: number; max_duration_months: number; annual_rate_bps: number;
  accepted_purposes: string[]; requires_guarantee: boolean; status: string; rejection_reason: string | null; created_at: string;
}
export interface Application {
  id: string; request_id: string; offer_id: string | null; lender_id: string; borrower_id: string; principal: number;
  annual_rate_bps: number; duration_months: number; quote: import('@/lib/loan').Quote; fee_total: number;
  interest_total: number; total_cost: number; message: string | null; status: string; expires_at: string; created_at: string;
}
export interface Contract {
  id: string; contract_no: number; application_id: string; borrower_id: string; lender_id: string; principal: number;
  annual_rate_bps: number; duration_months: number; interest_total: number; fee_total: number; net_disbursed: number;
  total_repayable: number; total_cost: number; effective_annual_rate_bps: number; late_fee_bps: number; grace_days: number;
  schedule_snapshot: import('@/lib/loan').Installment[]; terms_hash: string; terms_version: string; status: string;
  borrower_signed_at: string | null; lender_signed_at: string | null; created_at: string;
}
export interface Loan {
  id: string; country_code: string; loan_no: number; contract_id: string; borrower_id: string; lender_id: string; principal: number;
  annual_rate_bps: number; duration_months: number; interest_total: number; fee_total: number; total_repayable: number;
  amount_repaid: number; penalties_accrued: number; penalties_paid: number; status: string; is_simulation: boolean;
  disbursed_at: string | null; first_due_date: string | null; closed_at: string | null; created_at: string;
}
export interface ScheduleRow {
  id: string; loan_id: string; installment_no: number; due_date: string; principal_due: number; interest_due: number;
  penalty_due: number; principal_paid: number; interest_paid: number; penalty_paid: number; interest_waived: number;
  status: string; paid_at: string | null;
}
export interface Notification {
  id: string; type: string; title: string; body: string; data: Record<string, string>; channel: string;
  read_at: string | null; created_at: string;
}
export interface MarketRequest {
  id: string; country_code: string; amount: number; purpose: string; purpose_details: string | null; duration_months: number;
  max_annual_rate_bps: number; risk_grade: string; borrower_display: string; borrower_kyc_verified: boolean;
  guarantee_type: string; published_at: string | null;
}
export interface CountrySettings {
  country_code: string; min_amount: number; max_amount: number; min_duration_months: number; max_duration_months: number;
  max_annual_rate_bps: number; late_fee_bps: number; grace_days: number; payments_live_enabled: boolean; display_timezone: string;
  auto_approve_max_amount: number; legal_notice: string | null;
}
