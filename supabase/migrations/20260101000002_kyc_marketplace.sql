-- =============================================================================
-- JURU — 0002 KYC, profils emprunteur/prêteur, marché, contrats
-- =============================================================================

-- ---------- KYC --------------------------------------------------------------
create table kyc_submissions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  status                kyc_status not null default 'pending',
  document_type         kyc_document_type not null,
  document_number_last4 text check (document_number_last4 ~ '^[A-Za-z0-9]{0,4}$'), -- jamais le numéro complet
  document_expiry       date,
  -- Chemins dans le bucket PRIVÉ « kyc-documents » : {user_id}/{submission_id}/front.jpg …
  front_path            text not null,
  back_path             text,
  selfie_path           text not null,
  consent_at            timestamptz not null,          -- consentement explicite au traitement
  consent_version       text not null,                 -- version du texte de consentement
  auto_checks           jsonb not null default '{}',
  auto_risk_score       int check (auto_risk_score between 0 and 100),
  info_request          text,                          -- message de demande de complément
  submitted_at          timestamptz not null default now(),
  reviewed_at           timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  check (front_path like user_id::text || '/%'),
  check (selfie_path like user_id::text || '/%'),
  check (back_path is null or back_path like user_id::text || '/%')
);
create index kyc_submissions_user_idx on kyc_submissions(user_id, created_at desc);
create index kyc_submissions_status_idx on kyc_submissions(status) where status in ('pending','more_info_required');
-- une seule soumission « en cours » par utilisateur
create unique index kyc_one_pending_per_user on kyc_submissions(user_id) where status = 'pending';

create table kyc_reviews (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references kyc_submissions(id) on delete cascade,
  reviewer_id    uuid not null references profiles(id),
  decision       kyc_status not null check (decision in ('approved','rejected','more_info_required')),
  reason         text,
  notes          text,
  created_at     timestamptz not null default now(),
  check (decision = 'approved' or reason is not null)
);
create index kyc_reviews_submission_idx on kyc_reviews(submission_id);

-- ---------- Profils métier ---------------------------------------------------
create table borrower_profiles (
  user_id                uuid primary key references profiles(id) on delete cascade,
  employment_status      text check (employment_status in ('employee','self_employed','farmer','trader','student','unemployed','retired','other')),
  occupation             text,
  employer_name          text,
  monthly_income         bigint not null default 0 check (monthly_income >= 0),
  monthly_expenses       bigint not null default 0 check (monthly_expenses >= 0),
  existing_debt_monthly  bigint not null default 0 check (existing_debt_monthly >= 0),
  dependents             int not null default 0 check (dependents >= 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger trg_borrower_profiles_updated before update on borrower_profiles
  for each row execute function set_updated_at();

create table lender_profiles (
  user_id                  uuid primary key references profiles(id) on delete cascade,
  partner_id               uuid references partner_accounts(id),  -- prêteur institutionnel éventuel
  risk_appetite            text not null default 'moderate' check (risk_appetite in ('low','moderate','high')),
  investment_experience    text check (investment_experience in ('none','some','experienced')),
  source_of_funds          text,                                   -- contrôle AML
  max_exposure_per_loan    bigint check (max_exposure_per_loan is null or max_exposure_per_loan > 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_lender_profiles_updated before update on lender_profiles
  for each row execute function set_updated_at();

-- ---------- Demandes de financement -----------------------------------------
create table loan_requests (
  id                   uuid primary key default gen_random_uuid(),
  borrower_id          uuid not null references profiles(id),
  country_code         text not null references countries(code),
  amount               bigint not null check (amount between 5000 and 500000),
  purpose              loan_purpose not null,
  purpose_details      text check (char_length(purpose_details) <= 1000),
  duration_months      int not null check (duration_months between 1 and 24),
  max_annual_rate_bps  int not null check (max_annual_rate_bps >= 0),   -- taux max acceptable par l'emprunteur
  monthly_income       bigint not null check (monthly_income >= 0),
  monthly_expenses     bigint not null check (monthly_expenses >= 0),
  existing_debt_monthly bigint not null default 0 check (existing_debt_monthly >= 0),
  repayment_capacity   bigint not null,                                 -- calculé côté serveur
  status               loan_request_status not null default 'pending_review',
  risk_score           int check (risk_score between 0 and 100),
  auto_review          jsonb not null default '{}',
  reviewed_by          uuid references profiles(id),
  reviewed_at          timestamptz,
  rejection_reason     text,
  published_at         timestamptz,
  expires_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (status <> 'rejected' or rejection_reason is not null)
);
create index loan_requests_borrower_idx on loan_requests(borrower_id, created_at desc);
create index loan_requests_open_idx on loan_requests(country_code, amount, duration_months) where status = 'open';
create index loan_requests_status_idx on loan_requests(status);
create trigger trg_loan_requests_updated before update on loan_requests
  for each row execute function set_updated_at();

create table guarantees (
  id                uuid primary key default gen_random_uuid(),
  loan_request_id   uuid not null references loan_requests(id) on delete cascade,
  loan_id           uuid,                       -- FK ajoutée après création de loans
  type              guarantee_type not null default 'none',
  description       text,
  estimated_value   bigint check (estimated_value is null or estimated_value >= 0),
  guarantor_name    text,
  guarantor_phone   text,
  status            guarantee_status not null default 'declared',
  verified_by       uuid references profiles(id),
  verified_at       timestamptz,
  created_at        timestamptz not null default now(),
  check (type = 'none' or description is not null)
);
create index guarantees_request_idx on guarantees(loan_request_id);

-- ---------- Offres de financement -------------------------------------------
create table funding_offers (
  id                    uuid primary key default gen_random_uuid(),
  lender_id             uuid not null references profiles(id),
  country_code          text not null references countries(code),
  partner_id            uuid references partner_accounts(id),
  title                 text not null check (char_length(title) between 3 and 120),
  amount_available      bigint not null check (amount_available >= 0),
  initial_amount        bigint not null check (initial_amount > 0),
  min_amount            bigint not null default 5000 check (min_amount > 0),
  max_amount            bigint not null check (max_amount >= min_amount),
  min_duration_months   int not null default 1 check (min_duration_months >= 1),
  max_duration_months   int not null check (max_duration_months >= min_duration_months),
  annual_rate_bps       int not null check (annual_rate_bps >= 0),
  accepted_purposes     loan_purpose[] not null default '{}',   -- vide = tous
  requires_guarantee    boolean not null default false,
  status                funding_offer_status not null default 'pending_review',
  reviewed_by           uuid references profiles(id),
  reviewed_at           timestamptz,
  rejection_reason      text,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (amount_available <= initial_amount),
  check (max_amount <= 500000)
);
create index funding_offers_lender_idx on funding_offers(lender_id, created_at desc);
create index funding_offers_active_idx on funding_offers(country_code, annual_rate_bps) where status = 'active';
create trigger trg_funding_offers_updated before update on funding_offers
  for each row execute function set_updated_at();

-- ---------- Propositions (matching) -----------------------------------------
create table loan_applications (
  id                    uuid primary key default gen_random_uuid(),
  request_id            uuid not null references loan_requests(id),
  offer_id              uuid references funding_offers(id),
  lender_id             uuid not null references profiles(id),
  borrower_id           uuid not null references profiles(id),
  country_code          text not null references countries(code),
  principal             bigint not null check (principal between 5000 and 500000),
  annual_rate_bps       int not null check (annual_rate_bps >= 0),
  duration_months       int not null check (duration_months between 1 and 24),
  quote                 jsonb not null,                -- devis complet : échéancier, frais, coût total, TAEG
  fee_total             bigint not null check (fee_total >= 0),
  interest_total        bigint not null check (interest_total >= 0),
  total_cost            bigint not null check (total_cost >= 0),  -- coût du crédit = intérêts + frais
  message               text check (char_length(message) <= 500),
  status                application_status not null default 'proposed',
  expires_at            timestamptz not null default (now() + interval '7 days'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (lender_id <> borrower_id)
);
create index loan_applications_request_idx on loan_applications(request_id, status);
create index loan_applications_lender_idx on loan_applications(lender_id);
create index loan_applications_borrower_idx on loan_applications(borrower_id);
create unique index loan_applications_one_open_per_pair
  on loan_applications(request_id, lender_id) where status in ('proposed','accepted');
create trigger trg_loan_applications_updated before update on loan_applications
  for each row execute function set_updated_at();

-- ---------- Contrats ----------------------------------------------------------
create table loan_contracts (
  id                    uuid primary key default gen_random_uuid(),
  contract_no           bigint generated always as identity,
  application_id        uuid not null unique references loan_applications(id),
  request_id            uuid not null references loan_requests(id),
  borrower_id           uuid not null references profiles(id),
  lender_id             uuid not null references profiles(id),
  country_code          text not null references countries(code),
  principal             bigint not null check (principal > 0),
  annual_rate_bps       int not null,
  duration_months       int not null,
  interest_total        bigint not null,
  fee_total             bigint not null,             -- commission plateforme, prélevée au décaissement (visible)
  net_disbursed         bigint not null,             -- principal - fee_total
  total_repayable       bigint not null,             -- principal + intérêts
  total_cost            bigint not null,             -- intérêts + frais
  effective_annual_rate_bps int not null,            -- TAEG
  late_fee_bps          int not null,                -- pénalité figée à la signature
  grace_days            int not null,
  schedule_snapshot     jsonb not null,              -- [{no, month_offset, principal, interest, total}]
  terms_version         text not null default 'v1-demo',
  terms_hash            text not null,               -- sha256 des conditions : preuve d'intégrité
  pdf_path              text,                        -- Storage privé « contracts »
  status                contract_status not null default 'pending_signature',
  borrower_signed_at    timestamptz,
  lender_signed_at      timestamptz,
  borrower_signature    jsonb,                       -- preuves : ip, user-agent, OTP revérifié…
  lender_signature      jsonb,
  cooling_off_ends_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (net_disbursed = principal - fee_total),
  check (total_cost = interest_total + fee_total)
);
create index loan_contracts_borrower_idx on loan_contracts(borrower_id);
create index loan_contracts_lender_idx on loan_contracts(lender_id);
create trigger trg_loan_contracts_updated before update on loan_contracts
  for each row execute function set_updated_at();

-- Aucun changement rétroactif : les conditions financières sont immuables dès la création,
-- et un contrat signé n'est plus modifiable (sauf chemin du PDF généré).
create or replace function protect_contract_terms() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un contrat ne peut pas être supprimé' using errcode = '42501';
  end if;
  if (new.principal, new.annual_rate_bps, new.duration_months, new.interest_total, new.fee_total,
      new.net_disbursed, new.total_repayable, new.total_cost, new.effective_annual_rate_bps,
      new.late_fee_bps, new.grace_days, new.schedule_snapshot, new.terms_hash, new.borrower_id,
      new.lender_id, new.application_id)
     is distinct from
     (old.principal, old.annual_rate_bps, old.duration_months, old.interest_total, old.fee_total,
      old.net_disbursed, old.total_repayable, old.total_cost, old.effective_annual_rate_bps,
      old.late_fee_bps, old.grace_days, old.schedule_snapshot, old.terms_hash, old.borrower_id,
      old.lender_id, old.application_id) then
    raise exception 'Conditions du contrat immuables (aucun changement rétroactif)' using errcode = '42501';
  end if;
  if old.status = 'signed' and
     (new.status is distinct from old.status
      or new.borrower_signed_at is distinct from old.borrower_signed_at
      or new.lender_signed_at is distinct from old.lender_signed_at
      or new.borrower_signature is distinct from old.borrower_signature
      or new.lender_signature is distinct from old.lender_signature) then
    raise exception 'Contrat signé : modification interdite' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_contract_protect before update or delete on loan_contracts
  for each row execute function protect_contract_terms();
