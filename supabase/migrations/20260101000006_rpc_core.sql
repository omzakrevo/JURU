-- =============================================================================
-- JURU — 0006 RPC métier (1/2) : helpers, devis, KYC, demandes, offres, matching
-- Toutes les fonctions sensibles sont SECURITY DEFINER, vérifient auth.uid() et les rôles.
-- Convention d'erreurs : message préfixé par un CODE_EN_MAJUSCULES (mappé côté client).
-- =============================================================================

-- ---------- Helpers internes --------------------------------------------------
create or replace function _require_user() returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'AUTH_REQUIRED: connexion requise' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = v and status <> 'active') then
    raise exception 'ACCOUNT_SUSPENDED: compte suspendu' using errcode = '42501';
  end if;
  return v;
end $$;

create or replace function _require_role(p_roles app_role[]) returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user();
begin
  if not has_any_role(p_roles) then
    raise exception 'FORBIDDEN: droits insuffisants' using errcode = '42501';
  end if;
  return v;
end $$;

create or replace function _country_today(p_country text) returns date
language sql stable security definer set search_path = public, pg_temp as $$
  select (now() at time zone coalesce((select display_timezone from country_settings where country_code = p_country),'UTC'))::date
$$;

create or replace function _notify(p_user uuid, p_type text, p_title text, p_body text,
                                   p_data jsonb default '{}', p_sms boolean default false, p_push boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into notifications(user_id, channel, type, title, body, data, status, sent_at)
  values (p_user, 'in_app', p_type, p_title, p_body, p_data, 'sent', now());
  if p_sms then
    insert into notifications(user_id, channel, type, title, body, data) values (p_user, 'sms', p_type, p_title, p_body, p_data);
  end if;
  if p_push then
    insert into notifications(user_id, channel, type, title, body, data) values (p_user, 'push', p_type, p_title, p_body, p_data);
  end if;
end $$;
revoke execute on function _notify(uuid,text,text,text,jsonb,boolean,boolean) from public, anon, authenticated;

create or replace function mark_notifications_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); n int;
begin
  update notifications set read_at = now(), status = case when channel = 'in_app' then 'read' else status end
   where user_id = v and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count; return n;
end $$;

-- ---------- Échéancier, frais, TAEG ------------------------------------------
-- Annuité constante en FCFA entiers ; la dernière échéance absorbe l'arrondi.
create or replace function calc_schedule(p_principal bigint, p_rate_bps int, p_months int)
returns table(installment_no int, month_offset int, principal_due bigint, interest_due bigint, total_due bigint)
language plpgsql immutable as $$
declare r numeric := p_rate_bps / 10000.0 / 12.0; pay bigint; bal bigint := p_principal; i int; intr bigint; prin bigint;
begin
  if p_principal <= 0 or p_months < 1 then raise exception 'INVALID_TERMS: montant ou durée invalide'; end if;
  if r = 0 then pay := ceil(p_principal::numeric / p_months)::bigint;
  else pay := round(p_principal * r / (1 - power(1 + r, -p_months)))::bigint; end if;
  for i in 1..p_months loop
    intr := round(bal * r)::bigint;
    if i = p_months then prin := bal; else prin := least(greatest(pay - intr, 0), bal); end if;
    installment_no := i; month_offset := i; principal_due := prin; interest_due := intr; total_due := prin + intr;
    bal := bal - prin;
    return next;
  end loop;
end $$;

create or replace function compute_fee(p_country text, p_principal bigint) returns bigint
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare f platform_fees; v bigint;
begin
  select * into f from platform_fees where country_code = p_country and fee_type = 'origination' and is_active;
  if not found then return 0; end if;
  v := case f.calc_method when 'percent_bps' then round(p_principal * f.value / 10000.0)::bigint else f.value end;
  v := greatest(v, f.min_amount);
  if f.max_amount is not null then v := least(v, f.max_amount); end if;
  return least(v, p_principal - 1);
end $$;

-- TAEG (taux annuel effectif global) par dichotomie sur le taux mensuel.
create or replace function effective_annual_rate_bps(p_net bigint, p_totals bigint[]) returns int
language plpgsql immutable as $$
declare lo numeric := 0; hi numeric := 5; mid numeric; f numeric; i int;
begin
  if p_net <= 0 then return 0; end if;
  if (select sum(x) from unnest(p_totals) x) <= p_net then return 0; end if;
  for k in 1..80 loop
    mid := (lo + hi) / 2; f := -p_net;
    for i in 1..array_length(p_totals,1) loop f := f + p_totals[i] / power(1 + mid, i); end loop;
    if f > 0 then lo := mid; else hi := mid; end if;
  end loop;
  return round((power(1 + mid, 12) - 1) * 10000)::int;
end $$;

-- Devis complet et transparent : tout est affiché avant acceptation.
create or replace function quote_loan(p_country text, p_principal bigint, p_rate_bps int, p_months int)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare s country_settings; v_fee bigint; v_int bigint; v_tot bigint; v_net bigint; v_inst jsonb; v_totals bigint[];
begin
  select * into s from country_settings where country_code = p_country;
  if not found then raise exception 'COUNTRY_UNSUPPORTED: pays non configuré'; end if;
  if p_principal < s.min_amount or p_principal > s.max_amount then
    raise exception 'AMOUNT_OUT_OF_RANGE: montant entre % et % FCFA', s.min_amount, s.max_amount; end if;
  if p_months < s.min_duration_months or p_months > s.max_duration_months then
    raise exception 'DURATION_OUT_OF_RANGE: durée entre % et % mois', s.min_duration_months, s.max_duration_months; end if;
  if p_rate_bps < 0 or p_rate_bps > s.max_annual_rate_bps then
    raise exception 'RATE_OUT_OF_RANGE: taux annuel maximum % bps', s.max_annual_rate_bps; end if;
  select jsonb_agg(jsonb_build_object('no', installment_no, 'month_offset', month_offset,
           'principal', principal_due, 'interest', interest_due, 'total', total_due) order by installment_no),
         sum(interest_due), array_agg(total_due order by installment_no)
    into v_inst, v_int, v_totals from calc_schedule(p_principal, p_rate_bps, p_months);
  v_fee := compute_fee(p_country, p_principal);
  v_tot := p_principal + v_int;
  v_net := p_principal - v_fee;
  return jsonb_build_object(
    'currency','XOF','country_code',p_country,'principal',p_principal,'annual_rate_bps',p_rate_bps,
    'duration_months',p_months,'installments',v_inst,'monthly_payment',(v_inst->0->>'total')::bigint,
    'interest_total',v_int,'fee_total',v_fee,'net_disbursed',v_net,'total_repayable',v_tot,
    'total_cost',v_int + v_fee,'effective_annual_rate_bps',effective_annual_rate_bps(v_net, v_totals),
    'late_fee_bps',s.late_fee_bps,'grace_days',s.grace_days,
    'early_repayment_policy','Remboursement anticipé : capital restant dû + intérêts échus ; intérêts futurs non dus.',
    'fee_policy','Commission de mise en relation prélevée une seule fois au décaissement, incluse dans le coût total.');
end $$;

-- ---------- KYC ---------------------------------------------------------------
create or replace function submit_kyc(
  p_document_type kyc_document_type, p_document_last4 text, p_document_expiry date,
  p_front_path text, p_back_path text, p_selfie_path text,
  p_consent boolean, p_consent_version text default 'v1-demo')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); v_id uuid; v_checks jsonb; v_score int := 10; p profiles;
begin
  if not coalesce(p_consent,false) then raise exception 'CONSENT_REQUIRED: consentement KYC obligatoire'; end if;
  select * into p from profiles where id = v;
  if p.kyc_status = 'approved' then raise exception 'KYC_ALREADY_APPROVED: identité déjà validée'; end if;
  if exists (select 1 from kyc_submissions where user_id = v and status = 'pending') then
    raise exception 'KYC_PENDING: une vérification est déjà en cours'; end if;
  if p.full_name is null or p.birth_date is null then
    raise exception 'PROFILE_INCOMPLETE: renseignez votre nom et date de naissance avant le KYC'; end if;
  v_checks := jsonb_build_object(
    'adult', age(p.birth_date) >= interval '18 years',
    'document_not_expired', p_document_expiry is null or p_document_expiry > current_date + 30,
    'has_back', p_back_path is not null or p_document_type = 'passport');
  if not (v_checks->>'adult')::boolean then v_score := v_score + 60; end if;
  if not (v_checks->>'document_not_expired')::boolean then v_score := v_score + 40; end if;
  if not (v_checks->>'has_back')::boolean then v_score := v_score + 20; end if;
  insert into kyc_submissions(user_id, document_type, document_number_last4, document_expiry,
      front_path, back_path, selfie_path, consent_at, consent_version, auto_checks, auto_risk_score)
  values (v, p_document_type, right(p_document_last4, 4), p_document_expiry,
      p_front_path, p_back_path, p_selfie_path, now(), p_consent_version, v_checks, least(v_score,100))
  returning id into v_id;
  update profiles set kyc_status = 'pending' where id = v;
  perform _notify(v, 'kyc_submitted', 'Vérification en cours', 'Vos documents ont bien été reçus. Nous vous répondrons rapidement.');
  return v_id;
end $$;

create or replace function review_kyc(p_submission uuid, p_decision kyc_status, p_reason text default null, p_notes text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','compliance_officer']::app_role[]); s kyc_submissions;
begin
  if p_decision not in ('approved','rejected','more_info_required') then
    raise exception 'INVALID_DECISION: décision invalide'; end if;
  if p_decision <> 'approved' and coalesce(trim(p_reason),'') = '' then
    raise exception 'REASON_REQUIRED: motif obligatoire'; end if;
  select * into s from kyc_submissions where id = p_submission for update;
  if not found then raise exception 'NOT_FOUND: soumission introuvable'; end if;
  if s.status <> 'pending' then raise exception 'INVALID_STATE: soumission déjà traitée'; end if;
  if s.user_id = v then raise exception 'SELF_REVIEW_FORBIDDEN: vous ne pouvez pas valider votre propre KYC' using errcode='42501'; end if;
  insert into kyc_reviews(submission_id, reviewer_id, decision, reason, notes) values (p_submission, v, p_decision, p_reason, p_notes);
  update kyc_submissions set status = p_decision, reviewed_at = now(), info_request = p_reason,
         expires_at = case when p_decision = 'approved' then now() + interval '24 months' end
   where id = p_submission;
  update profiles set kyc_status = p_decision where id = s.user_id;
  perform _notify(s.user_id, 'kyc_' || p_decision::text,
    case p_decision when 'approved' then 'Identité validée' when 'rejected' then 'Vérification refusée' else 'Complément demandé' end,
    case p_decision when 'approved' then 'Votre identité est vérifiée. Vous pouvez emprunter ou prêter.'
                    else coalesce(p_reason,'') end, '{}', true, true);
end $$;

-- ---------- Demandes de financement ------------------------------------------
create or replace function submit_loan_request(
  p_amount bigint, p_purpose loan_purpose, p_details text, p_duration int, p_max_rate_bps int,
  p_income bigint, p_expenses bigint, p_existing_debt bigint default 0,
  p_guarantee_type guarantee_type default 'none', p_guarantee_desc text default null,
  p_guarantee_value bigint default null, p_guarantor_name text default null, p_guarantor_phone text default null)
returns loan_requests language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); me profiles; s country_settings; cap bigint; inst bigint; ratio numeric;
        score int := 20; reasons text[] := '{}'; v_status loan_request_status; r loan_requests; n int;
begin
  select * into me from profiles where id = v;
  select * into s from country_settings where country_code = me.country_code;
  if not me.is_borrower then raise exception 'ROLE_NOT_ENABLED: activez le profil emprunteur'; end if;
  if s.kyc_required_to_borrow and me.kyc_status <> 'approved' then
    raise exception 'KYC_REQUIRED: identité à vérifier avant de demander un financement'; end if;
  select count(*) into n from loan_requests where borrower_id = v and status in ('pending_review','open','in_negotiation');
  if n >= 3 then raise exception 'LIMIT_REACHED: 3 demandes actives maximum'; end if;
  if exists (select 1 from loans where borrower_id = v and status in ('overdue','defaulted')) then
    raise exception 'OVERDUE_LOAN: régularisez vos retards avant une nouvelle demande'; end if;
  -- validation des bornes + devis (lève une erreur explicite si hors bornes)
  perform quote_loan(me.country_code, p_amount, p_max_rate_bps, p_duration);
  cap := p_income - p_expenses - coalesce(p_existing_debt,0);
  select total_due into inst from calc_schedule(p_amount, p_max_rate_bps, p_duration) where installment_no = 1;
  if cap <= 0 then score := score + 70; reasons := array_append(reasons, 'capacité de remboursement nulle ou négative');
  else
    ratio := inst::numeric / cap;
    if ratio > 1 then score := score + 60; reasons := array_append(reasons, 'mensualité supérieure à la capacité');
    elsif ratio > 0.7 then score := score + 40; reasons := array_append(reasons, 'mensualité > 70% de la capacité');
    elsif ratio > 0.5 then score := score + 25; reasons := array_append(reasons, 'mensualité > 50% de la capacité');
    elsif ratio > 0.3 then score := score + 10; end if;
  end if;
  if p_amount > 200000 then score := score + 15; reasons := array_append(reasons, 'montant élevé');
  elsif p_amount > 100000 then score := score + 8; end if;
  if p_duration > 12 then score := score + 5; end if;
  if p_guarantee_type <> 'none' then score := score - 10; end if;
  if exists (select 1 from loans where borrower_id = v and status = 'repaid') then score := score - 10; end if;
  score := greatest(0, least(100, score));
  v_status := case when score <= s.auto_approve_max_risk and p_amount <= s.auto_approve_max_amount and cap > 0
                   then 'open' else 'pending_review' end;
  insert into borrower_profiles(user_id, monthly_income, monthly_expenses, existing_debt_monthly)
  values (v, p_income, p_expenses, coalesce(p_existing_debt,0))
  on conflict (user_id) do update set monthly_income = excluded.monthly_income,
     monthly_expenses = excluded.monthly_expenses, existing_debt_monthly = excluded.existing_debt_monthly;
  insert into loan_requests(borrower_id, country_code, amount, purpose, purpose_details, duration_months,
      max_annual_rate_bps, monthly_income, monthly_expenses, existing_debt_monthly, repayment_capacity,
      status, risk_score, auto_review, published_at, expires_at)
  values (v, me.country_code, p_amount, p_purpose, p_details, p_duration, p_max_rate_bps, p_income,
      p_expenses, coalesce(p_existing_debt,0), cap, v_status, score,
      jsonb_build_object('score', score, 'reasons', reasons, 'estimated_installment', inst,
                         'auto_decision', case when v_status = 'open' then 'published' else 'manual_review' end),
      case when v_status = 'open' then now() end, now() + interval '30 days')
  returning * into r;
  if p_guarantee_type <> 'none' then
    insert into guarantees(loan_request_id, type, description, estimated_value, guarantor_name, guarantor_phone)
    values (r.id, p_guarantee_type, p_guarantee_desc, p_guarantee_value, p_guarantor_name, p_guarantor_phone);
  end if;
  perform _notify(v, 'request_' || v_status::text,
    case v_status when 'open' then 'Demande publiée' else 'Demande en cours d''examen' end,
    case v_status when 'open' then 'Votre demande est visible par les prêteurs vérifiés.'
                  else 'Un agent examine votre demande sous peu.' end, jsonb_build_object('request_id', r.id));
  return r;
end $$;

create or replace function review_loan_request(p_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','credit_agent']::app_role[]); r loan_requests;
begin
  select * into r from loan_requests where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: demande introuvable'; end if;
  if r.status <> 'pending_review' then raise exception 'INVALID_STATE: demande non en attente'; end if;
  if r.borrower_id = v then raise exception 'SELF_REVIEW_FORBIDDEN: conflit d''intérêts' using errcode='42501'; end if;
  if not p_approve and coalesce(trim(p_reason),'') = '' then raise exception 'REASON_REQUIRED: motif obligatoire'; end if;
  update loan_requests set status = case when p_approve then 'open'::loan_request_status else 'rejected'::loan_request_status end,
         reviewed_by = v, reviewed_at = now(), rejection_reason = case when p_approve then null else p_reason end,
         published_at = case when p_approve then now() end
   where id = p_id;
  perform _notify(r.borrower_id, case when p_approve then 'request_open' else 'request_rejected' end,
     case when p_approve then 'Demande publiée' else 'Demande refusée' end,
     case when p_approve then 'Votre demande est maintenant visible par les prêteurs.' else coalesce(p_reason,'') end,
     jsonb_build_object('request_id', p_id), true, true);
end $$;

create or replace function cancel_loan_request(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); r loan_requests;
begin
  select * into r from loan_requests where id = p_id and borrower_id = v for update;
  if not found then raise exception 'NOT_FOUND: demande introuvable'; end if;
  if r.status not in ('draft','pending_review','open') then raise exception 'INVALID_STATE: annulation impossible à ce stade'; end if;
  update loan_requests set status = 'cancelled' where id = p_id;
  update loan_applications set status = 'rejected' where request_id = p_id and status = 'proposed';
end $$;

-- ---------- Offres de financement --------------------------------------------
create or replace function publish_funding_offer(
  p_title text, p_amount bigint, p_min_amount bigint, p_max_amount bigint, p_min_duration int, p_max_duration int,
  p_rate_bps int, p_purposes loan_purpose[] default '{}', p_requires_guarantee boolean default false)
returns funding_offers language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); me profiles; s country_settings; lp lender_profiles; o funding_offers; v_status funding_offer_status;
begin
  select * into me from profiles where id = v;
  select * into s from country_settings where country_code = me.country_code;
  if not me.is_lender then raise exception 'ROLE_NOT_ENABLED: activez le profil prêteur'; end if;
  if s.kyc_required_to_lend and me.kyc_status <> 'approved' then
    raise exception 'KYC_REQUIRED: identité à vérifier avant de publier une offre'; end if;
  select * into lp from lender_profiles where user_id = v;
  if not found or coalesce(trim(lp.source_of_funds),'') = '' then
    raise exception 'LENDER_PROFILE_INCOMPLETE: origine des fonds à renseigner (contrôle AML)'; end if;
  if p_min_amount < s.min_amount or p_max_amount > s.max_amount or p_max_amount < p_min_amount then
    raise exception 'AMOUNT_OUT_OF_RANGE: montants par prêt entre % et % FCFA', s.min_amount, s.max_amount; end if;
  if p_amount < p_min_amount or p_amount > s.max_amount * 100 then
    raise exception 'AMOUNT_OUT_OF_RANGE: montant disponible invalide (min % FCFA)', p_min_amount; end if;
  if p_min_duration < s.min_duration_months or p_max_duration > s.max_duration_months or p_max_duration < p_min_duration then
    raise exception 'DURATION_OUT_OF_RANGE: durée entre % et % mois', s.min_duration_months, s.max_duration_months; end if;
  if p_rate_bps < 0 or p_rate_bps > s.max_annual_rate_bps then raise exception 'RATE_OUT_OF_RANGE: taux annuel maximum % bps', s.max_annual_rate_bps; end if;
  v_status := case when p_amount <= s.auto_approve_max_amount * 5 then 'active' else 'pending_review' end;
  insert into funding_offers(lender_id, country_code, partner_id, title, amount_available, initial_amount, min_amount,
      max_amount, min_duration_months, max_duration_months, annual_rate_bps, accepted_purposes, requires_guarantee, status)
  values (v, me.country_code, lp.partner_id, p_title, p_amount, p_amount, p_min_amount, p_max_amount, p_min_duration,
      p_max_duration, p_rate_bps, coalesce(p_purposes,'{}'), p_requires_guarantee, v_status)
  returning * into o;
  return o;
end $$;

create or replace function review_funding_offer(p_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','credit_agent','compliance_officer']::app_role[]); o funding_offers;
begin
  select * into o from funding_offers where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: offre introuvable'; end if;
  if o.status <> 'pending_review' then raise exception 'INVALID_STATE: offre non en attente'; end if;
  if o.lender_id = v then raise exception 'SELF_REVIEW_FORBIDDEN: conflit d''intérêts' using errcode='42501'; end if;
  if not p_approve and coalesce(trim(p_reason),'') = '' then raise exception 'REASON_REQUIRED: motif obligatoire'; end if;
  update funding_offers set status = case when p_approve then 'active'::funding_offer_status else 'rejected'::funding_offer_status end,
         reviewed_by = v, reviewed_at = now(), rejection_reason = case when p_approve then null else p_reason end
   where id = p_id;
  perform _notify(o.lender_id, case when p_approve then 'offer_active' else 'offer_rejected' end,
     case when p_approve then 'Offre activée' else 'Offre refusée' end,
     case when p_approve then 'Votre offre est visible par les emprunteurs.' else coalesce(p_reason,'') end);
end $$;

create or replace function set_offer_status(p_id uuid, p_status funding_offer_status) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); o funding_offers;
begin
  select * into o from funding_offers where id = p_id and lender_id = v for update;
  if not found then raise exception 'NOT_FOUND: offre introuvable'; end if;
  if p_status not in ('active','paused','closed') then raise exception 'INVALID_STATE: statut non autorisé'; end if;
  if o.status not in ('active','paused') then raise exception 'INVALID_STATE: offre non modifiable'; end if;
  update funding_offers set status = p_status where id = p_id;
end $$;

-- ---------- Matching ----------------------------------------------------------
create or replace function find_matching_offers(p_request_id uuid)
returns table(offer_id uuid, lender_id uuid, lender_display text, title text, annual_rate_bps int,
              amount_available bigint, match_score int, quote jsonb)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); r loan_requests;
begin
  select * into r from loan_requests where id = p_request_id;
  if not found or (r.borrower_id <> v and not is_staff()) then raise exception 'NOT_FOUND: demande introuvable'; end if;
  return query
  select o.id, o.lender_id,
         (select c.display_name from (select trim(split_part(coalesce(pr.full_name,'Prêteur'),' ',1) || ' ' ||
              coalesce(left(nullif(split_part(coalesce(pr.full_name,''),' ',2),''),1) || '.', '')) as display_name
              from profiles pr where pr.id = o.lender_id) c),
         o.title, o.annual_rate_bps, o.amount_available,
         greatest(0, least(100, 100 - (o.annual_rate_bps * 40 / greatest(r.max_annual_rate_bps,1))
                           - case when r.amount < o.max_amount / 4 then 10 else 0 end))::int,
         quote_loan(r.country_code, r.amount, o.annual_rate_bps, r.duration_months)
    from funding_offers o
   where o.status = 'active' and o.country_code = r.country_code and o.lender_id <> r.borrower_id
     and r.amount between o.min_amount and o.max_amount and o.amount_available >= r.amount
     and r.duration_months between o.min_duration_months and o.max_duration_months
     and o.annual_rate_bps <= r.max_annual_rate_bps
     and (cardinality(o.accepted_purposes) = 0 or r.purpose = any(o.accepted_purposes))
     and (not o.requires_guarantee or exists (select 1 from guarantees g where g.loan_request_id = r.id and g.type <> 'none'))
   order by 7 desc, o.annual_rate_bps asc limit 20;
end $$;

create or replace function find_matching_requests(p_offer_id uuid)
returns table(request_id uuid, amount bigint, purpose loan_purpose, duration_months int,
              max_annual_rate_bps int, risk_grade text, borrower_display text, match_score int)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); o funding_offers;
begin
  select * into o from funding_offers where id = p_offer_id and lender_id = v;
  if not found then raise exception 'NOT_FOUND: offre introuvable'; end if;
  return query
  select m.id, m.amount, m.purpose, m.duration_months, m.max_annual_rate_bps, m.risk_grade, m.borrower_display,
         greatest(0, least(100, 100 - abs(m.amount - o.max_amount) * 30 / greatest(o.max_amount,1)::bigint))::int
    from marketplace_requests m
   where m.country_code = o.country_code
     and m.amount between o.min_amount and least(o.max_amount, o.amount_available)
     and m.duration_months between o.min_duration_months and o.max_duration_months
     and o.annual_rate_bps <= m.max_annual_rate_bps
     and (cardinality(o.accepted_purposes) = 0 or m.purpose = any(o.accepted_purposes))
     and (not o.requires_guarantee or m.guarantee_type <> 'none')
   order by 8 desc limit 50;
end $$;
