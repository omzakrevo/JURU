-- =============================================================================
-- KREDIA — 0003 Crédits, paiements, décaissements, grand livre
-- =============================================================================

-- ---------- Crédits -----------------------------------------------------------
create table loans (
  id                  uuid primary key default gen_random_uuid(),
  loan_no             bigint generated always as identity,
  contract_id         uuid not null unique references loan_contracts(id),
  borrower_id         uuid not null references profiles(id),
  lender_id           uuid not null references profiles(id),
  country_code        text not null references countries(code),
  principal           bigint not null check (principal > 0),
  annual_rate_bps     int not null,
  duration_months     int not null,
  interest_total      bigint not null,
  fee_total           bigint not null,
  total_repayable     bigint not null,
  amount_repaid       bigint not null default 0 check (amount_repaid >= 0),   -- principal+intérêts imputés
  penalties_accrued   bigint not null default 0 check (penalties_accrued >= 0),
  penalties_paid      bigint not null default 0 check (penalties_paid >= 0),
  status              loan_status not null default 'awaiting_disbursement',
  is_simulation       boolean not null default true,
  disbursed_at        timestamptz,
  first_due_date      date,
  closed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (amount_repaid <= total_repayable),
  check (penalties_paid <= penalties_accrued)
);
create index loans_borrower_idx on loans(borrower_id);
create index loans_lender_idx on loans(lender_id);
create index loans_status_idx on loans(status);
create trigger trg_loans_updated before update on loans
  for each row execute function set_updated_at();

alter table guarantees add constraint guarantees_loan_fk foreign key (loan_id) references loans(id);

create table repayment_schedules (
  id                uuid primary key default gen_random_uuid(),
  loan_id           uuid not null references loans(id) on delete cascade,
  installment_no    int not null check (installment_no >= 1),
  due_date          date not null,
  principal_due     bigint not null check (principal_due >= 0),
  interest_due      bigint not null check (interest_due >= 0),
  penalty_due       bigint not null default 0 check (penalty_due >= 0),
  principal_paid    bigint not null default 0 check (principal_paid >= 0),
  interest_paid     bigint not null default 0 check (interest_paid >= 0),
  penalty_paid      bigint not null default 0 check (penalty_paid >= 0),
  interest_waived   bigint not null default 0 check (interest_waived >= 0),  -- remboursement anticipé
  status            installment_status not null default 'pending',
  paid_at           timestamptz,
  reminder_sent_on  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (loan_id, installment_no),
  check (principal_paid <= principal_due),
  check (interest_paid + interest_waived <= interest_due),
  check (penalty_paid <= penalty_due)
);
create index repayment_schedules_due_idx on repayment_schedules(due_date) where status in ('pending','partial','overdue');
create trigger trg_repayment_schedules_updated before update on repayment_schedules
  for each row execute function set_updated_at();

-- ---------- Paiements ---------------------------------------------------------
create table payment_transactions (
  id                  uuid primary key default gen_random_uuid(),
  type                payment_txn_type not null,
  provider            payment_provider not null default 'simulation',
  status              payment_txn_status not null default 'initiated',
  amount              bigint not null check (amount > 0),
  fee_amount          bigint not null default 0 check (fee_amount >= 0),
  currency            text not null default 'XOF',
  payer_id            uuid references profiles(id),
  payee_id            uuid references profiles(id),
  loan_id             uuid references loans(id),
  country_code        text not null references countries(code),
  idempotency_key     text not null unique,                   -- prévention des doubles paiements
  provider_reference  text,                                   -- référence fournisseur (réel uniquement)
  msisdn_masked       text,                                   -- jamais le numéro complet en clair
  is_simulation       boolean not null default true,
  failure_reason      text,
  raw_request         jsonb,
  raw_response        jsonb,
  reconciliation_status text not null default 'unreconciled'
                        check (reconciliation_status in ('unreconciled','matched','mismatch','ignored')),
  reconciled_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (provider <> 'simulation' or is_simulation),           -- provider simulation => simulation
  check (is_simulation or provider <> 'simulation')
);
create unique index payment_txn_provider_ref_uq on payment_transactions(provider, provider_reference)
  where provider_reference is not null;
create index payment_txn_loan_idx on payment_transactions(loan_id);
create index payment_txn_status_idx on payment_transactions(status, created_at desc);
create trigger trg_payment_transactions_updated before update on payment_transactions
  for each row execute function set_updated_at();

-- Garde-fou : aucune transaction réelle tant que le pays n'a pas activé les paiements réels.
create or replace function guard_live_payments() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_live boolean;
begin
  if not new.is_simulation then
    select payments_live_enabled into v_live from country_settings where country_code = new.country_code;
    if coalesce(v_live, false) = false then
      raise exception 'PAIEMENTS RÉELS DÉSACTIVÉS pour le pays % : seule la simulation est autorisée', new.country_code
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger trg_payment_txn_guard before insert or update on payment_transactions
  for each row execute function guard_live_payments();

-- Événements webhook bruts : unicité (provider, event_id) = idempotence
create table payment_webhook_events (
  id               uuid primary key default gen_random_uuid(),
  provider         payment_provider not null,
  event_id         text not null,
  signature_valid  boolean not null,
  payload          jsonb not null,
  status           text not null default 'received' check (status in ('received','processed','ignored','failed')),
  error            text,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz,
  unique (provider, event_id)
);

create table disbursements (
  id                    uuid primary key default gen_random_uuid(),
  loan_id               uuid not null unique references loans(id),
  lender_id             uuid not null references profiles(id),
  borrower_id           uuid not null references profiles(id),
  country_code          text not null references countries(code),
  gross_amount          bigint not null check (gross_amount > 0),
  fee_amount            bigint not null check (fee_amount >= 0),
  net_amount            bigint not null check (net_amount > 0),
  status                disbursement_status not null default 'pending_approval',
  is_simulation         boolean not null default true,
  requested_by          uuid not null references profiles(id),
  approval_request_id   uuid,                                -- FK ajoutée après approval_requests
  collection_txn_id     uuid references payment_transactions(id),
  payout_txn_id         uuid references payment_transactions(id),
  executed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (net_amount = gross_amount - fee_amount)
);
create trigger trg_disbursements_updated before update on disbursements
  for each row execute function set_updated_at();

create table repayments (
  id                    uuid primary key default gen_random_uuid(),
  loan_id               uuid not null references loans(id),
  payer_id              uuid not null references profiles(id),
  amount                bigint not null check (amount > 0),
  kind                  text not null check (kind in ('regular','partial','early_full')),
  allocation            jsonb not null,                       -- [{installment_no, penalty, interest, principal}]
  principal_part        bigint not null default 0,
  interest_part         bigint not null default 0,
  penalty_part          bigint not null default 0,
  collection_txn_id     uuid references payment_transactions(id),
  payout_txn_id         uuid references payment_transactions(id),
  idempotency_key       text not null unique,
  is_simulation         boolean not null default true,
  created_at            timestamptz not null default now(),
  check (principal_part + interest_part + penalty_part = amount)
);
create index repayments_loan_idx on repayments(loan_id, created_at desc);

-- ---------- Commissions -------------------------------------------------------
create table platform_fees (
  id             uuid primary key default gen_random_uuid(),
  country_code   text not null references countries(code),
  fee_type       text not null check (fee_type in ('origination')),
  calc_method    text not null check (calc_method in ('percent_bps','fixed')),
  value          bigint not null check (value >= 0),         -- bps ou FCFA
  min_amount     bigint not null default 0 check (min_amount >= 0),
  max_amount     bigint check (max_amount is null or max_amount >= min_amount),
  borne_by       text not null default 'borrower' check (borne_by in ('borrower')),
  description    text not null,
  is_active      boolean not null default true,
  effective_from timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create unique index platform_fees_one_active on platform_fees(country_code, fee_type) where is_active;

-- ---------- Grand livre (partie double, immuable) ----------------------------
create table ledger_accounts (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  type          ledger_account_type not null,
  normal_side   text not null check (normal_side in ('debit','credit')),
  country_code  text references countries(code),
  is_system     boolean not null default true,
  description   text,
  created_at    timestamptz not null default now()
);

create table ledger_journals (
  id               uuid primary key default gen_random_uuid(),
  journal_no       bigint generated always as identity,
  description      text not null,
  reference_type   text,                    -- 'disbursement' | 'repayment' | 'adjustment' | 'reversal'
  reference_id     uuid,
  loan_id          uuid references loans(id),
  country_code     text not null references countries(code),
  is_simulation    boolean not null default true,
  idempotency_key  text unique,
  reversal_of      uuid references ledger_journals(id),
  posted_by        uuid references profiles(id),
  posted_at        timestamptz not null default now()
);
create index ledger_journals_loan_idx on ledger_journals(loan_id);
create unique index ledger_one_reversal on ledger_journals(reversal_of) where reversal_of is not null;

create table ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  journal_id  uuid not null references ledger_journals(id),
  account_id  uuid not null references ledger_accounts(id),
  debit       bigint not null default 0 check (debit >= 0),
  credit      bigint not null default 0 check (credit >= 0),
  user_id     uuid references profiles(id),     -- dimension : prêteur/emprunteur concerné
  loan_id     uuid references loans(id),
  created_at  timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index ledger_entries_journal_idx on ledger_entries(journal_id);
create index ledger_entries_account_idx on ledger_entries(account_id);

-- Immuabilité
create or replace function ledger_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Le grand livre est immuable : utilisez une écriture d''extourne' using errcode = '42501';
end $$;
create trigger trg_ledger_entries_immutable before update or delete on ledger_entries
  for each row execute function ledger_immutable();
create trigger trg_ledger_journals_immutable before update or delete on ledger_journals
  for each row execute function ledger_immutable();
create trigger trg_ledger_entries_truncate before truncate on ledger_entries
  for each statement execute function ledger_immutable();

-- Équilibre : somme des débits = somme des crédits, vérifié en fin de transaction
create or replace function ledger_check_balanced() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_d bigint; v_c bigint; v_n int;
begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0), count(*)
    into v_d, v_c, v_n from ledger_entries where journal_id = new.journal_id;
  if v_d <> v_c or v_n < 2 then
    raise exception 'Écriture déséquilibrée (journal %): débit=% crédit=% lignes=%', new.journal_id, v_d, v_c, v_n
      using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger trg_ledger_balanced after insert on ledger_entries
  deferrable initially deferred for each row execute function ledger_check_balanced();

-- API interne de comptabilisation (appelée uniquement par les RPC métier)
-- p_lines : [{"account":"1010","debit":1000,"user_id":null,"loan_id":null}, ...]
create or replace function post_journal(
  p_description text, p_reference_type text, p_reference_id uuid, p_loan_id uuid,
  p_country text, p_is_simulation boolean, p_idempotency_key text, p_lines jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_journal uuid; v_line jsonb; v_account uuid;
begin
  if p_idempotency_key is not null then
    select id into v_journal from ledger_journals where idempotency_key = p_idempotency_key;
    if found then return v_journal; end if;
  end if;
  insert into ledger_journals(description, reference_type, reference_id, loan_id, country_code,
                              is_simulation, idempotency_key, posted_by)
  values (p_description, p_reference_type, p_reference_id, p_loan_id, p_country,
          p_is_simulation, p_idempotency_key, auth.uid())
  returning id into v_journal;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select id into v_account from ledger_accounts where code = v_line->>'account';
    if v_account is null then raise exception 'Compte comptable inconnu: %', v_line->>'account'; end if;
    if coalesce((v_line->>'debit')::bigint,0) + coalesce((v_line->>'credit')::bigint,0) = 0 then continue; end if;
    insert into ledger_entries(journal_id, account_id, debit, credit, user_id, loan_id)
    values (v_journal, v_account, coalesce((v_line->>'debit')::bigint,0), coalesce((v_line->>'credit')::bigint,0),
            nullif(v_line->>'user_id','')::uuid, coalesce(nullif(v_line->>'loan_id','')::uuid, p_loan_id));
  end loop;
  return v_journal;
end $$;
revoke execute on function post_journal(text,text,uuid,uuid,text,boolean,text,jsonb) from public, anon, authenticated;

-- Extourne d'un journal (correction) : écritures inverses, jamais de modification
create or replace function reverse_journal(p_journal uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_j ledger_journals; v_new uuid;
begin
  if not has_any_role(array['super_admin','finance_manager']::app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  select * into v_j from ledger_journals where id = p_journal;
  if not found then raise exception 'Journal introuvable'; end if;
  insert into ledger_journals(description, reference_type, reference_id, loan_id, country_code,
                              is_simulation, reversal_of, posted_by)
  values ('EXTOURNE #'||v_j.journal_no||' — '||coalesce(p_reason,''), 'reversal', v_j.id, v_j.loan_id,
          v_j.country_code, v_j.is_simulation, v_j.id, auth.uid())
  returning id into v_new;
  insert into ledger_entries(journal_id, account_id, debit, credit, user_id, loan_id)
  select v_new, account_id, credit, debit, user_id, loan_id from ledger_entries where journal_id = p_journal;
  return v_new;
end $$;

-- Soldes par compte (vue pour l'admin / rapprochement)
create or replace view ledger_balances with (security_invoker = true) as
select a.id as account_id, a.code, a.name, a.type, a.normal_side,
       coalesce(sum(e.debit),0)  as total_debit,
       coalesce(sum(e.credit),0) as total_credit,
       case a.normal_side when 'debit' then coalesce(sum(e.debit - e.credit),0)
                          else coalesce(sum(e.credit - e.debit),0) end as balance
from ledger_accounts a left join ledger_entries e on e.account_id = a.id
group by a.id;
