-- =============================================================================
-- KREDIA — 0004 Notifications, litiges, audit, double validation
-- =============================================================================

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  channel       notification_channel not null default 'in_app',
  type          text not null,                  -- kyc_approved, installment_reminder, transaction…
  title         text not null,
  body          text not null,
  data          jsonb not null default '{}',
  status        notification_status not null default 'pending',
  scheduled_at  timestamptz not null default now(),
  sent_at       timestamptz,
  read_at       timestamptz,
  attempts      int not null default 0,
  last_error    text,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);
create index notifications_queue_idx on notifications(scheduled_at) where status = 'pending' and channel in ('sms','push');

create table device_tokens (                       -- Firebase Cloud Messaging
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null default 'android' check (platform in ('android','ios','web')),
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index device_tokens_user_idx on device_tokens(user_id);

create table disputes (
  id                uuid primary key default gen_random_uuid(),
  loan_id           uuid not null references loans(id),
  opened_by         uuid not null references profiles(id),
  against_user_id   uuid references profiles(id),
  category          text not null check (category in ('payment_not_received','wrong_amount','fraud','contract_terms','harassment','other')),
  description       text not null check (char_length(description) between 10 and 2000),
  status            dispute_status not null default 'open',
  assigned_to       uuid references profiles(id),
  resolution        text,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (status not in ('resolved','rejected') or resolution is not null)
);
create index disputes_loan_idx on disputes(loan_id);
create index disputes_status_idx on disputes(status);
create trigger trg_disputes_updated before update on disputes
  for each row execute function set_updated_at();

-- ---------- Audit (append-only) ----------------------------------------------
create table audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  actor_role   text,
  action       text not null,                   -- INSERT/UPDATE/DELETE ou action métier
  entity_type  text not null,
  entity_id    text,
  old_data     jsonb,
  new_data     jsonb,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);
create index audit_logs_actor_idx on audit_logs(actor_id, created_at desc);
create index audit_logs_created_idx on audit_logs(created_at desc);

create or replace function audit_immutable() returns trigger
language plpgsql as $$
begin raise exception 'Le journal d''audit est en ajout seul' using errcode = '42501'; end $$;
create trigger trg_audit_immutable before update or delete on audit_logs
  for each row execute function audit_immutable();
create trigger trg_audit_truncate before truncate on audit_logs
  for each statement execute function audit_immutable();

-- Écriture d'un événement d'audit métier
create or replace function write_audit(p_action text, p_entity text, p_entity_id text,
                                       p_old jsonb, p_new jsonb, p_meta jsonb default '{}')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into audit_logs(actor_id, actor_role, action, entity_type, entity_id, old_data, new_data, metadata)
  values (auth.uid(),
          (select string_agg(role::text, ',') from user_roles where user_id = auth.uid()),
          p_action, p_entity, p_entity_id, p_old, p_new, p_meta);
end $$;
revoke execute on function write_audit(text,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;

-- Trigger générique sur les tables sensibles (données de documents masquées)
create or replace function audit_row_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_old jsonb; v_new jsonb; v_id text;
begin
  v_old := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  v_old := v_old - 'front_path' - 'back_path' - 'selfie_path';
  v_new := v_new - 'front_path' - 'back_path' - 'selfie_path';
  v_id := coalesce(v_new->>'id', v_old->>'id', v_new->>'user_id', v_old->>'user_id');
  insert into audit_logs(actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(),
          (select string_agg(role::text, ',') from user_roles where user_id = auth.uid()),
          tg_op, tg_table_name, v_id, v_old, v_new);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','user_roles','kyc_submissions','kyc_reviews','loan_requests',
    'funding_offers','loan_applications','loan_contracts','loans','disbursements','repayments',
    'payment_transactions','partner_accounts','country_settings','platform_fees','disputes','guarantees']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s
                    for each row execute function audit_row_change()', t);
  end loop;
end $$;

-- ---------- Double validation -------------------------------------------------
create table approval_requests (
  id             uuid primary key default gen_random_uuid(),
  action_type    text not null check (action_type in ('disbursement','role_grant')),
  entity_type    text not null,
  entity_id      uuid not null,
  payload        jsonb not null default '{}',
  requested_by   uuid not null references profiles(id),
  status         approval_status not null default 'pending',
  approved_by    uuid references profiles(id),
  decision_note  text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '3 days'),
  -- Le demandeur ne peut JAMAIS valider sa propre demande.
  check (approved_by is null or approved_by <> requested_by),
  check (status not in ('approved','executed','rejected') or approved_by is not null)
);
create index approval_requests_status_idx on approval_requests(status, created_at desc);
create unique index approval_one_pending_per_entity on approval_requests(action_type, entity_id) where status = 'pending';
create trigger trg_audit_approval_requests after insert or update or delete on approval_requests
  for each row execute function audit_row_change();

alter table disbursements add constraint disbursements_approval_fk
  foreign key (approval_request_id) references approval_requests(id);
