-- =============================================================================
-- JURU — 0012 Circuit de paiement : schéma (modes simulation / test SAS Pay / réel)
-- MODES : 'simulation' (rien n'est envoyé) · 'sandbox' (API SAS Pay avec clé sk_test_ : aucun argent réel)
--         · 'live' (argent réel : INTERDIT tant que payments_live_enabled = false).
-- =============================================================================
alter type disbursement_status add value if not exists 'awaiting_funding';      -- approuvé, en attente des fonds du prêteur
alter type disbursement_status add value if not exists 'funding_in_progress';   -- collecte prêteur initiée
alter type disbursement_status add value if not exists 'paying_out';            -- fonds reçus, versement emprunteur en cours
alter type disbursement_status add value if not exists 'payout_failed';         -- fonds collectés mais versement échoué : traitement manuel

alter table country_settings add column if not exists payments_sandbox_enabled boolean not null default false;
alter table country_settings add constraint country_settings_one_mode
  check (not (payments_live_enabled and payments_sandbox_enabled));

alter table profiles add column if not exists mobile_money_channel text
  check (mobile_money_channel is null or mobile_money_channel in ('orange_money','moov_money'));
grant update (mobile_money_channel) on profiles to authenticated;

alter table payment_transactions
  add column if not exists mode text not null default 'simulation' check (mode in ('simulation','sandbox','live')),
  add column if not exists purpose text check (purpose in ('disbursement_collect','disbursement_payout','repayment_collect','repayment_payout')),
  add column if not exists disbursement_id uuid references disbursements(id),
  add column if not exists repayment_id uuid references repayments(id),
  add column if not exists repayment_intent_id uuid,
  add column if not exists checkout_url text,
  add column if not exists claimed_at timestamptz,
  add column if not exists attempts int not null default 0,
  add column if not exists last_verified_at timestamptz;
-- cohérence : « réel » <=> pas une simulation d'argent
alter table payment_transactions add constraint payment_txn_mode_consistent check ((mode = 'live') = (not is_simulation));
create index payment_txn_pending_idx on payment_transactions(status, last_verified_at) where status in ('initiated','pending');

-- Un décaissement échoué/refusé/annulé peut être redemandé : unicité seulement sur les décaissements « actifs »
alter table disbursements drop constraint disbursements_loan_id_key;
create unique index disbursements_one_active_per_loan on disbursements(loan_id)
  where status not in ('failed','rejected','cancelled');

-- Intentions de remboursement (mode test/réel : l'imputation n'a lieu qu'APRÈS confirmation de l'encaissement)
create table repayment_intents (
  id               uuid primary key default gen_random_uuid(),
  loan_id          uuid not null references loans(id),
  payer_id         uuid not null references profiles(id),
  amount           bigint not null check (amount > 0),
  early_full       boolean not null default false,
  idempotency_key  text not null unique,
  status           text not null default 'created' check (status in ('created','collecting','applied','failed')),
  collection_txn_id uuid references payment_transactions(id),
  repayment_id     uuid references repayments(id),
  failure_reason   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table payment_transactions add constraint payment_txn_intent_fk
  foreign key (repayment_intent_id) references repayment_intents(id);
create trigger trg_repayment_intents_updated before update on repayment_intents
  for each row execute function set_updated_at();
create trigger trg_audit_repayment_intents after insert or update on repayment_intents
  for each row execute function audit_row_change();
alter table repayment_intents enable row level security;
revoke all on repayment_intents from anon, authenticated;
create policy repayment_intents_select on repayment_intents for select to authenticated
  using (payer_id = auth.uid() or has_any_role(array['super_admin','finance_manager','accountant','auditor']::app_role[]));
grant select on repayment_intents to authenticated;

-- Compte des trop-perçus à restituer
insert into ledger_accounts(code, name, type, normal_side, description) values
  ('2300','Trop-perçus à restituer','liability','credit','Encaissements excédant le solde dû, à rembourser au payeur')
on conflict (code) do nothing;
