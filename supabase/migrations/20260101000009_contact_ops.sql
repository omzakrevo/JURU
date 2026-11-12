-- =============================================================================
-- JURU — 0009 Formulaire de contact public + exploitation (conservation, planification)
-- =============================================================================
create table contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or char_length(phone) <= 20),
  subject     text not null check (char_length(subject) between 3 and 150),
  message     text not null check (char_length(message) between 10 and 3000),
  status      text not null default 'new' check (status in ('new','in_progress','done','spam')),
  handled_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index contact_messages_status_idx on contact_messages(status, created_at desc);
alter table contact_messages enable row level security;
revoke all on contact_messages from anon, authenticated;
create policy contact_staff_read on contact_messages for select to authenticated
  using (has_any_role(array['super_admin','support','compliance_officer']::app_role[]));
grant select on contact_messages to authenticated;

-- Dépôt public (anon) : validations serveur + plafond anti-abus global (60 messages/heure)
create or replace function submit_contact_message(p_name text, p_email text, p_phone text, p_subject text, p_message text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'RATE_LIMITED: trop de messages, réessayez plus tard';
  end if;
  insert into contact_messages(name, email, phone, subject, message)
  values (trim(p_name), nullif(trim(p_email),''), nullif(trim(p_phone),''), trim(p_subject), trim(p_message));
end $$;
revoke execute on function submit_contact_message(text,text,text,text,text) from public;
grant execute on function submit_contact_message(text,text,text,text,text) to anon, authenticated;

create or replace function set_contact_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','support']::app_role[]);
begin
  if p_status not in ('new','in_progress','done','spam') then raise exception 'INVALID_STATE: statut invalide'; end if;
  update contact_messages set status = p_status, handled_by = v where id = p_id;
end $$;
revoke execute on function set_contact_status(uuid,text) from public, anon;

-- Conservation des données : purge/anonymisation à exécuter périodiquement (pg_cron ou Edge Function)
-- NB : ne supprime JAMAIS le grand livre ni l'audit (obligations comptables/légales).
create or replace function apply_retention_policy() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare n_contact int; n_notif int;
begin
  if auth.uid() is not null and not has_any_role(array['super_admin','compliance_officer']::app_role[]) then
    raise exception 'FORBIDDEN: droits insuffisants' using errcode = '42501'; end if;
  delete from contact_messages where created_at < now() - interval '24 months';
  get diagnostics n_contact = row_count;
  delete from notifications where created_at < now() - interval '12 months' and read_at is not null;
  get diagnostics n_notif = row_count;
  return jsonb_build_object('contact_messages_deleted', n_contact, 'notifications_deleted', n_notif,
    'note', 'Les documents KYC expirés (kyc_retention_months) doivent être purgés du Storage par la conformité après revue.');
end $$;
revoke execute on function apply_retention_policy() from public, anon;
