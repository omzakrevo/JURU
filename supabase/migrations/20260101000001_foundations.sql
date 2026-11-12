-- =============================================================================
-- JURU — 0001 Fondations : types, helpers, pays, profils, rôles, partenaires
-- Montants : FCFA entiers (bigint). Dates : timestamptz (UTC).
-- JURU n'est PAS un établissement financier agréé (mise en relation uniquement).
-- =============================================================================

create extension if not exists pg_trgm;

-- ---------- Types énumérés ---------------------------------------------------
create type app_role as enum (
  'super_admin','compliance_officer','credit_agent','finance_manager',
  'accountant','support','auditor','user','partner'
);
create type kyc_status as enum ('not_started','pending','approved','rejected','more_info_required');
create type kyc_document_type as enum ('cnib','passport','driving_license','residence_card');
create type loan_purpose as enum (
  'commerce','agriculture','education','health','housing','equipment','emergency','transport','other'
);
create type loan_request_status as enum (
  'draft','pending_review','open','in_negotiation','accepted','rejected','cancelled','expired'
);
create type funding_offer_status as enum (
  'draft','pending_review','active','paused','exhausted','rejected','closed'
);
create type application_status as enum ('proposed','accepted','rejected','withdrawn','expired');
create type contract_status as enum ('pending_signature','partially_signed','signed','cancelled');
create type loan_status as enum (
  'awaiting_disbursement','active','overdue','repaid','defaulted','cancelled','in_dispute'
);
create type installment_status as enum ('pending','partial','paid','overdue');
create type payment_provider as enum ('simulation','orange_money','moov_money');
create type payment_txn_type as enum ('collection','disbursement','repayment','payout','fee','refund');
create type payment_txn_status as enum ('initiated','pending','succeeded','failed','cancelled','reversed');
create type disbursement_status as enum ('pending_approval','succeeded','rejected','failed','cancelled');
create type ledger_account_type as enum ('asset','liability','equity','revenue','expense');
create type guarantee_type as enum ('none','guarantor','collateral','savings_pledge');
create type guarantee_status as enum ('declared','verified','rejected','released');
create type notification_channel as enum ('in_app','sms','push');
create type notification_status as enum ('pending','sent','failed','read');
create type dispute_status as enum ('open','investigating','resolved','rejected','escalated');
create type approval_status as enum ('pending','approved','rejected','executed','expired');
create type partner_type as enum ('bank','sfd','mobile_money_operator','insurer','other');
create type partner_status as enum ('prospect','contract_signed','active','suspended');

-- ---------- Helpers génériques ----------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- Pays & paramètres par pays --------------------------------------
create table countries (
  code          text primary key check (code ~ '^[A-Z]{2}$'),
  name          text not null,
  currency      text not null default 'XOF',
  dial_code     text not null,
  timezone      text not null default 'UTC',
  is_launched   boolean not null default false,
  created_at    timestamptz not null default now()
);

create table country_settings (
  country_code               text primary key references countries(code),
  min_amount                 bigint  not null default 5000   check (min_amount > 0),
  max_amount                 bigint  not null default 500000 check (max_amount >= min_amount),
  min_duration_months        int     not null default 1  check (min_duration_months >= 1),
  max_duration_months        int     not null default 12 check (max_duration_months >= min_duration_months),
  -- Plafond de taux à valider juridiquement (usure) : valeur de démonstration.
  max_annual_rate_bps        int     not null default 2400 check (max_annual_rate_bps >= 0),
  late_fee_bps               int     not null default 200  check (late_fee_bps >= 0), -- pénalité unique en % du montant échu
  grace_days                 int     not null default 3    check (grace_days >= 0),
  default_after_days         int     not null default 90   check (default_after_days > 0),
  auto_approve_max_amount    bigint  not null default 100000,
  auto_approve_max_risk      int     not null default 40 check (auto_approve_max_risk between 0 and 100),
  kyc_required_to_borrow     boolean not null default true,
  kyc_required_to_lend       boolean not null default true,
  kyc_retention_months       int     not null default 60,
  data_retention_months      int     not null default 120,
  display_timezone           text    not null default 'Africa/Ouagadougou',
  -- Garde-fou : tant que false, tout paiement/décaissement DOIT être une simulation.
  payments_live_enabled      boolean not null default false,
  legal_notice               text,
  updated_at                 timestamptz not null default now()
);
create trigger trg_country_settings_updated before update on country_settings
  for each row execute function set_updated_at();

-- ---------- Profils ----------------------------------------------------------
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  phone               text unique,
  email               text,
  full_name           text,
  country_code        text not null default 'BF' references countries(code),
  birth_date          date,
  city                text,
  address             text,
  account_type        text not null default 'individual' check (account_type in ('individual','business')),
  business_name       text,
  business_registration_no text,
  preferred_locale    text not null default 'fr',
  kyc_status          kyc_status not null default 'not_started',
  is_borrower         boolean not null default true,
  is_lender           boolean not null default false,
  status              text not null default 'active' check (status in ('active','suspended','closed')),
  consent_terms_at    timestamptz,
  consent_privacy_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_country_idx on profiles(country_code);
create index profiles_kyc_idx on profiles(kyc_status);
create index profiles_name_trgm on profiles using gin (full_name gin_trgm_ops);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ---------- Rôles (RBAC) -----------------------------------------------------
create table user_roles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        app_role not null,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on user_roles(role);

create or replace function has_role(p_user uuid, p_role app_role) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from user_roles where user_id = p_user and role = p_role)
$$;

create or replace function has_any_role(p_roles app_role[]) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = any (p_roles))
$$;

-- Personnel interne = tout rôle sauf user/partner
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from user_roles where user_id = auth.uid()
                 and role not in ('user','partner'))
$$;

-- ---------- Partenaires financiers ------------------------------------------
create table partner_accounts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  type              partner_type not null,
  country_code      text not null references countries(code),
  license_reference text,                    -- n° d'agrément (à renseigner par la conformité)
  status            partner_status not null default 'prospect',
  contract_reference text,
  contact_name      text,
  contact_email     text,
  contact_phone     text,
  api_provider      payment_provider,        -- NULL tant qu'aucune API officielle n'est contractualisée
  user_id           uuid references auth.users(id),  -- compte de connexion du partenaire
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- un partenaire ne peut être « active » sans contrat ni agrément référencés
  check (status not in ('active') or (contract_reference is not null and license_reference is not null))
);
create index partner_accounts_country_idx on partner_accounts(country_code);
create trigger trg_partner_accounts_updated before update on partner_accounts
  for each row execute function set_updated_at();

-- ---------- Création automatique du profil à l'inscription -------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles (id, phone, email, full_name, country_code)
  values (new.id, new.phone, new.email,
          nullif(new.raw_user_meta_data->>'full_name',''),
          coalesce(nullif(new.raw_user_meta_data->>'country_code',''), 'BF'))
  on conflict (id) do nothing;
  insert into user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Synchronise le téléphone confirmé (Supabase renseigne auth.users.phone après OTP)
create or replace function sync_user_contact() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update profiles set phone = coalesce(new.phone, phone), email = coalesce(new.email, email)
   where id = new.id;
  return new;
end $$;
create trigger on_auth_user_updated after update of phone, email on auth.users
  for each row execute function sync_user_contact();

-- Empêche l'utilisateur de modifier lui-même les champs protégés de son profil
-- NB : volontairement NON security definer, afin que current_user reflète le rôle appelant.
create or replace function protect_profile_columns() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user in ('postgres','service_role','supabase_admin') or is_staff() then
    return new;
  end if;
  if new.kyc_status is distinct from old.kyc_status
     or new.status is distinct from old.status
     or new.id is distinct from old.id then
    raise exception 'Modification interdite : champ protégé' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_profiles_protect before update on profiles
  for each row execute function protect_profile_columns();
