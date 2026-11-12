-- =============================================================================
-- JURU — 0007 RPC métier (2/2) : propositions, contrats, décaissement, remboursement, admin
-- MODE DÉMONSTRATION : tant que payments_live_enabled = false, tout flux d'argent est simulé.
-- =============================================================================

-- ---------- Propositions ------------------------------------------------------
create or replace function propose_application(p_request_id uuid, p_offer_id uuid default null,
                                               p_rate_bps int default null, p_message text default null)
returns loan_applications language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); me profiles; s country_settings; r loan_requests; o funding_offers;
        v_rate int; q jsonb; a loan_applications;
begin
  select * into me from profiles where id = v;
  select * into s from country_settings where country_code = me.country_code;
  if not me.is_lender then raise exception 'ROLE_NOT_ENABLED: activez le profil prêteur'; end if;
  if s.kyc_required_to_lend and me.kyc_status <> 'approved' then raise exception 'KYC_REQUIRED: identité à vérifier'; end if;
  select * into r from loan_requests where id = p_request_id for update;
  if not found or r.status <> 'open' then raise exception 'INVALID_STATE: demande indisponible'; end if;
  if r.borrower_id = v then raise exception 'SELF_DEAL_FORBIDDEN: vous ne pouvez pas financer votre propre demande'; end if;
  if r.country_code <> me.country_code then raise exception 'COUNTRY_MISMATCH: pays différents'; end if;
  if p_offer_id is not null then
    select * into o from funding_offers where id = p_offer_id and lender_id = v;
    if not found or o.status <> 'active' then raise exception 'INVALID_STATE: offre indisponible'; end if;
    if r.amount not between o.min_amount and o.max_amount or o.amount_available < r.amount
       or r.duration_months not between o.min_duration_months and o.max_duration_months then
      raise exception 'OFFER_INCOMPATIBLE: l''offre ne couvre pas cette demande'; end if;
    v_rate := o.annual_rate_bps;
  else
    v_rate := p_rate_bps;
  end if;
  if v_rate is null then raise exception 'RATE_REQUIRED: taux requis'; end if;
  if v_rate > r.max_annual_rate_bps then raise exception 'RATE_ABOVE_BORROWER_MAX: taux supérieur au maximum accepté par l''emprunteur'; end if;
  q := quote_loan(r.country_code, r.amount, v_rate, r.duration_months);
  insert into loan_applications(request_id, offer_id, lender_id, borrower_id, country_code, principal, annual_rate_bps,
      duration_months, quote, fee_total, interest_total, total_cost, message)
  values (r.id, p_offer_id, v, r.borrower_id, r.country_code, r.amount, v_rate, r.duration_months, q,
      (q->>'fee_total')::bigint, (q->>'interest_total')::bigint, (q->>'total_cost')::bigint, p_message)
  returning * into a;
  perform _notify(r.borrower_id, 'application_received', 'Nouvelle proposition',
     format('Une proposition de %s FCFA à %s%% par an est disponible.', r.amount, round(v_rate/100.0,2)),
     jsonb_build_object('application_id', a.id, 'request_id', r.id), true, true);
  return a;
exception when unique_violation then
  raise exception 'ALREADY_PROPOSED: vous avez déjà une proposition active pour cette demande';
end $$;

create or replace function withdraw_application(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user();
begin
  update loan_applications set status = 'withdrawn' where id = p_id and lender_id = v and status = 'proposed';
  if not found then raise exception 'INVALID_STATE: retrait impossible'; end if;
end $$;

-- L'emprunteur doit confirmer le coût total affiché (p_ack_total_cost) : aucune acceptation « à l'aveugle ».
create or replace function respond_application(p_id uuid, p_accept boolean, p_ack_total_cost bigint default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); a loan_applications; r loan_requests; o funding_offers; s country_settings;
        q jsonb; v_terms jsonb; v_hash text; v_contract uuid;
begin
  select * into a from loan_applications where id = p_id and borrower_id = v for update;
  if not found then raise exception 'NOT_FOUND: proposition introuvable'; end if;
  if a.status <> 'proposed' then raise exception 'INVALID_STATE: proposition déjà traitée'; end if;
  if not p_accept then
    update loan_applications set status = 'rejected' where id = p_id;
    perform _notify(a.lender_id, 'application_rejected', 'Proposition refusée', 'L''emprunteur a décliné votre proposition.');
    return null;
  end if;
  if a.expires_at < now() then update loan_applications set status = 'expired' where id = p_id;
    raise exception 'EXPIRED: proposition expirée'; end if;
  if p_ack_total_cost is distinct from a.total_cost then
    raise exception 'TOTAL_COST_NOT_ACKNOWLEDGED: confirmez le coût total du crédit (% FCFA) avant d''accepter', a.total_cost; end if;
  select * into r from loan_requests where id = a.request_id for update;
  if r.status <> 'open' then raise exception 'INVALID_STATE: demande plus disponible'; end if;
  if a.offer_id is not null then
    select * into o from funding_offers where id = a.offer_id for update;
    if o.status <> 'active' or o.amount_available < a.principal then raise exception 'OFFER_UNAVAILABLE: fonds de l''offre indisponibles'; end if;
    update funding_offers set amount_available = amount_available - a.principal,
           status = case when amount_available - a.principal = 0 then 'exhausted' else status end where id = o.id;
  end if;
  select * into s from country_settings where country_code = a.country_code;
  q := a.quote;
  v_terms := jsonb_build_object('principal', a.principal, 'annual_rate_bps', a.annual_rate_bps, 'duration_months', a.duration_months,
     'interest_total', q->'interest_total', 'fee_total', q->'fee_total', 'total_repayable', q->'total_repayable',
     'total_cost', q->'total_cost', 'taeg_bps', q->'effective_annual_rate_bps', 'late_fee_bps', s.late_fee_bps,
     'grace_days', s.grace_days, 'installments', q->'installments', 'borrower', a.borrower_id, 'lender', a.lender_id, 'version', 'v1-demo');
  v_hash := encode(sha256(convert_to(v_terms::text, 'utf8')), 'hex');
  insert into loan_contracts(application_id, request_id, borrower_id, lender_id, country_code, principal, annual_rate_bps,
      duration_months, interest_total, fee_total, net_disbursed, total_repayable, total_cost, effective_annual_rate_bps,
      late_fee_bps, grace_days, schedule_snapshot, terms_hash)
  values (a.id, a.request_id, a.borrower_id, a.lender_id, a.country_code, a.principal, a.annual_rate_bps, a.duration_months,
      (q->>'interest_total')::bigint, (q->>'fee_total')::bigint, (q->>'net_disbursed')::bigint, (q->>'total_repayable')::bigint,
      (q->>'total_cost')::bigint, (q->>'effective_annual_rate_bps')::int, s.late_fee_bps, s.grace_days, q->'installments', v_hash)
  returning id into v_contract;
  update loan_applications set status = 'accepted' where id = a.id;
  update loan_applications set status = 'rejected' where request_id = a.request_id and id <> a.id and status = 'proposed';
  update loan_requests set status = 'accepted' where id = a.request_id;
  perform _notify(a.lender_id, 'application_accepted', 'Proposition acceptée', 'Le contrat est prêt à être signé.',
     jsonb_build_object('contract_id', v_contract), true, true);
  return v_contract;
end $$;

-- ---------- Signature du contrat ---------------------------------------------
-- NB : « signature électronique » = acceptation explicite horodatée + preuves techniques
-- (hash des conditions, IP, user-agent, OTP revérifié). Sa valeur juridique en droit burkinabè/UEMOA
-- doit être validée par un conseil juridique avant tout usage réel.
create or replace function sign_contract(p_contract_id uuid, p_consent boolean, p_evidence jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); c loan_contracts; v_ev jsonb; v_loan uuid; v_both boolean;
begin
  if not coalesce(p_consent,false) then raise exception 'CONSENT_REQUIRED: acceptation explicite obligatoire'; end if;
  select * into c from loan_contracts where id = p_contract_id for update;
  if not found or v not in (c.borrower_id, c.lender_id) then raise exception 'NOT_FOUND: contrat introuvable'; end if;
  if c.status not in ('pending_signature','partially_signed') then raise exception 'INVALID_STATE: contrat non signable'; end if;
  v_ev := coalesce(p_evidence,'{}') || jsonb_build_object('terms_hash', c.terms_hash, 'signed_at', now(), 'user_id', v);
  if v = c.borrower_id then
    if c.borrower_signed_at is not null then raise exception 'ALREADY_SIGNED: déjà signé'; end if;
    update loan_contracts set borrower_signed_at = now(), borrower_signature = v_ev where id = c.id;
  else
    if c.lender_signed_at is not null then raise exception 'ALREADY_SIGNED: déjà signé'; end if;
    update loan_contracts set lender_signed_at = now(), lender_signature = v_ev where id = c.id;
  end if;
  select (borrower_signed_at is not null and lender_signed_at is not null) into v_both from loan_contracts where id = c.id;
  if v_both then
    update loan_contracts set status = 'signed' where id = c.id;
    insert into loans(contract_id, borrower_id, lender_id, country_code, principal, annual_rate_bps, duration_months,
        interest_total, fee_total, total_repayable)
    values (c.id, c.borrower_id, c.lender_id, c.country_code, c.principal, c.annual_rate_bps, c.duration_months,
        c.interest_total, c.fee_total, c.total_repayable) returning id into v_loan;
    update guarantees set loan_id = v_loan where loan_request_id = c.request_id;
    perform _notify(c.borrower_id, 'contract_signed', 'Contrat signé', 'Le décaissement va être traité après validation.', jsonb_build_object('loan_id', v_loan), true, true);
    perform _notify(c.lender_id, 'contract_signed', 'Contrat signé', 'Le décaissement va être traité après validation.', jsonb_build_object('loan_id', v_loan), true, true);
    return jsonb_build_object('status','signed','loan_id', v_loan);
  end if;
  update loan_contracts set status = 'partially_signed' where id = c.id;
  perform _notify(case when v = c.borrower_id then c.lender_id else c.borrower_id end, 'contract_signature_pending',
     'Signature en attente', 'L''autre partie a signé. À vous de signer le contrat.', jsonb_build_object('contract_id', c.id), true, true);
  return jsonb_build_object('status','partially_signed');
end $$;

create or replace function cancel_contract(p_contract_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); c loan_contracts;
begin
  select * into c from loan_contracts where id = p_contract_id for update;
  if not found or v not in (c.borrower_id, c.lender_id) then raise exception 'NOT_FOUND: contrat introuvable'; end if;
  if c.status = 'signed' then raise exception 'INVALID_STATE: contrat signé, ouvrez un litige'; end if;
  if c.status = 'cancelled' then return; end if;
  update loan_contracts set status = 'cancelled' where id = c.id;
  update loan_applications set status = 'withdrawn' where id = c.application_id;
  update loan_requests set status = 'open' where id = c.request_id and status = 'accepted';
  update funding_offers set amount_available = amount_available + c.principal,
         status = case when status = 'exhausted' then 'active' else status end
   where id = (select offer_id from loan_applications where id = c.application_id);
  perform _notify(case when v = c.borrower_id then c.lender_id else c.borrower_id end, 'contract_cancelled',
     'Contrat annulé', 'L''autre partie a annulé le contrat avant signature complète.');
end $$;

-- ---------- Double validation & décaissement simulé ---------------------------
create or replace function request_disbursement(p_loan_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','finance_manager','credit_agent']::app_role[]);
        l loans; d uuid; ap uuid;
begin
  select * into l from loans where id = p_loan_id for update;
  if not found then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  if l.status <> 'awaiting_disbursement' then raise exception 'INVALID_STATE: crédit non décaissable'; end if;
  if exists (select 1 from disbursements where loan_id = l.id) then raise exception 'ALREADY_REQUESTED: décaissement déjà demandé'; end if;
  insert into disbursements(loan_id, lender_id, borrower_id, country_code, gross_amount, fee_amount, net_amount, requested_by)
  values (l.id, l.lender_id, l.borrower_id, l.country_code, l.principal, l.fee_total, l.principal - l.fee_total, v)
  returning id into d;
  insert into approval_requests(action_type, entity_type, entity_id, payload, requested_by)
  values ('disbursement', 'disbursements', d, jsonb_build_object('loan_id', l.id, 'net_amount', l.principal - l.fee_total, 'simulation', true), v)
  returning id into ap;
  update disbursements set approval_request_id = ap where id = d;
  return ap;
end $$;

create or replace function request_role_grant(p_user uuid, p_role app_role) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin']::app_role[]); ap uuid;
begin
  if p_user = v then raise exception 'SELF_GRANT_FORBIDDEN: auto-attribution interdite'; end if;
  insert into approval_requests(action_type, entity_type, entity_id, payload, requested_by)
  values ('role_grant', 'user_roles', p_user, jsonb_build_object('role', p_role), v) returning id into ap;
  return ap;
end $$;

-- Exécution simulée interne d'un décaissement (aucun appel fournisseur)
create or replace function _execute_disbursement(p_disb_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare d disbursements; l loans; c loan_contracts; s country_settings; col uuid; pay uuid; v_today date; e jsonb;
begin
  select * into d from disbursements where id = p_disb_id for update;
  select * into l from loans where id = d.loan_id for update;
  select * into c from loan_contracts where id = l.contract_id;
  select * into s from country_settings where country_code = l.country_code;
  if s.payments_live_enabled then
    raise exception 'LIVE_PAYMENTS_NOT_IMPLEMENTED: les paiements réels passent par la PaymentGateway (Edge Function) après contractualisation';
  end if;
  if l.status <> 'awaiting_disbursement' then raise exception 'INVALID_STATE: crédit non décaissable'; end if;
  insert into payment_transactions(type, provider, status, amount, payer_id, payee_id, loan_id, country_code, idempotency_key, is_simulation)
  values ('collection','simulation','succeeded', d.gross_amount, d.lender_id, null, l.id, l.country_code, 'disb-col-'||d.id, true) returning id into col;
  insert into payment_transactions(type, provider, status, amount, fee_amount, payer_id, payee_id, loan_id, country_code, idempotency_key, is_simulation)
  values ('disbursement','simulation','succeeded', d.net_amount, d.fee_amount, null, d.borrower_id, l.id, l.country_code, 'disb-pay-'||d.id, true) returning id into pay;
  perform post_journal('[SIMULATION] Collecte des fonds du prêteur — crédit #'||l.loan_no, 'disbursement', d.id, l.id, l.country_code, true,
    'jr-disb-col-'||d.id, jsonb_build_array(
      jsonb_build_object('account','1010','debit',d.gross_amount,'user_id',d.lender_id),
      jsonb_build_object('account','2100','credit',d.gross_amount,'user_id',d.lender_id)));
  perform post_journal('[SIMULATION] Décaissement à l''emprunteur — crédit #'||l.loan_no, 'disbursement', d.id, l.id, l.country_code, true,
    'jr-disb-pay-'||d.id, jsonb_build_array(
      jsonb_build_object('account','2100','debit',d.gross_amount,'user_id',d.lender_id),
      jsonb_build_object('account','1010','credit',d.net_amount,'user_id',d.borrower_id),
      jsonb_build_object('account','4010','credit',d.fee_amount)));
  v_today := _country_today(l.country_code);
  for e in select * from jsonb_array_elements(c.schedule_snapshot) loop
    insert into repayment_schedules(loan_id, installment_no, due_date, principal_due, interest_due)
    values (l.id, (e->>'no')::int, (v_today + ((e->>'month_offset')::int * interval '1 month'))::date,
            (e->>'principal')::bigint, (e->>'interest')::bigint);
  end loop;
  update loans set status = 'active', disbursed_at = now(), first_due_date = (v_today + interval '1 month')::date where id = l.id;
  update disbursements set status = 'succeeded', executed_at = now(), collection_txn_id = col, payout_txn_id = pay where id = d.id;
  perform _notify(d.borrower_id, 'disbursement_done', '[DÉMO] Fonds décaissés (simulation)',
    format('%s FCFA nets ont été « versés » en mode démonstration.', d.net_amount), jsonb_build_object('loan_id', l.id), true, true);
  perform _notify(d.lender_id, 'disbursement_done', '[DÉMO] Décaissement effectué (simulation)', 'Le crédit est actif. Échéancier disponible.', jsonb_build_object('loan_id', l.id));
end $$;
revoke execute on function _execute_disbursement(uuid) from public, anon, authenticated;

create or replace function decide_approval(p_approval_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); a approval_requests; r app_role;
begin
  select * into a from approval_requests where id = p_approval_id for update;
  if not found then raise exception 'NOT_FOUND: demande introuvable'; end if;
  if a.status <> 'pending' then raise exception 'INVALID_STATE: demande déjà traitée'; end if;
  if a.requested_by = v then raise exception 'SELF_APPROVAL_FORBIDDEN: double validation requise (un autre utilisateur doit valider)' using errcode = '42501'; end if;
  if a.expires_at < now() then update approval_requests set status = 'expired' where id = a.id; raise exception 'EXPIRED: demande expirée'; end if;
  if a.action_type = 'disbursement' then
    if not has_any_role(array['super_admin','finance_manager']::app_role[]) then raise exception 'FORBIDDEN: droits insuffisants' using errcode='42501'; end if;
  elsif a.action_type = 'role_grant' then
    if not has_role(v, 'super_admin') then raise exception 'FORBIDDEN: droits insuffisants' using errcode='42501'; end if;
  end if;
  if not p_approve then
    update approval_requests set status = 'rejected', approved_by = v, decision_note = p_note, decided_at = now() where id = a.id;
    if a.action_type = 'disbursement' then update disbursements set status = 'rejected' where id = a.entity_id; end if;
    return;
  end if;
  update approval_requests set status = 'approved', approved_by = v, decision_note = p_note, decided_at = now() where id = a.id;
  if a.action_type = 'disbursement' then
    perform _execute_disbursement(a.entity_id);
  elsif a.action_type = 'role_grant' then
    r := (a.payload->>'role')::app_role;
    insert into user_roles(user_id, role, granted_by) values (a.entity_id, r, v) on conflict do nothing;
  end if;
  update approval_requests set status = 'executed' where id = a.id;
end $$;

-- ---------- Remboursements ----------------------------------------------------
create or replace function get_payoff_amount(p_loan_id uuid) returns bigint
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); l loans; v_today date;
begin
  select * into l from loans where id = p_loan_id;
  if not found or (v <> l.borrower_id and not is_staff()) then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  v_today := _country_today(l.country_code);
  return coalesce((select sum((principal_due - principal_paid) + (penalty_due - penalty_paid)
            + case when due_date <= v_today then interest_due - interest_paid - interest_waived else 0 end)
          from repayment_schedules where loan_id = p_loan_id and status <> 'paid'), 0);
end $$;

create or replace function record_repayment(p_loan_id uuid, p_amount bigint, p_idempotency_key text, p_early_full boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); l loans; s country_settings; v_today date; rp repayments; i repayment_schedules;
        v_rem bigint; v_pen bigint; v_int bigint; v_prin bigint; t_pen bigint := 0; t_int bigint := 0; t_prin bigint := 0;
        alloc jsonb := '[]'; v_payoff bigint; v_target bigint; v_kind text; col uuid; pay uuid; v_pi bigint;
        v_left int; v_new_status installment_status; v_waive bigint;
begin
  if coalesce(trim(p_idempotency_key),'') = '' then raise exception 'IDEMPOTENCY_KEY_REQUIRED: clé d''idempotence requise'; end if;
  select * into rp from repayments where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('repayment_id', rp.id, 'amount', rp.amount, 'idempotent_replay', true); end if;
  select * into l from loans where id = p_loan_id for update;
  if not found or (v <> l.borrower_id and not is_staff()) then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  if l.status not in ('active','overdue') then raise exception 'INVALID_STATE: crédit non remboursable (statut %)', l.status; end if;
  select * into s from country_settings where country_code = l.country_code;
  if s.payments_live_enabled then raise exception 'LIVE_PAYMENTS_NOT_IMPLEMENTED: paiements réels via PaymentGateway'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'AMOUNT_INVALID: montant invalide'; end if;
  v_today := _country_today(l.country_code);
  v_payoff := get_payoff_amount(l.id);
  if p_early_full then
    if p_amount <> v_payoff then raise exception 'PAYOFF_MISMATCH: le solde de remboursement anticipé est de % FCFA', v_payoff; end if;
  elsif p_amount > (select sum((principal_due-principal_paid)+(interest_due-interest_paid-interest_waived)+(penalty_due-penalty_paid))
                      from repayment_schedules where loan_id = l.id and status <> 'paid') then
    raise exception 'AMOUNT_TOO_HIGH: montant supérieur au solde restant dû';
  end if;
  select (principal_due-principal_paid)+(interest_due-interest_paid-interest_waived)+(penalty_due-penalty_paid) into v_target
    from repayment_schedules where loan_id = l.id and status <> 'paid' order by installment_no limit 1;
  v_rem := p_amount;
  for i in select * from repayment_schedules where loan_id = l.id and status <> 'paid' order by installment_no for update loop
    exit when v_rem <= 0;
    v_waive := 0;
    if p_early_full and i.due_date > v_today then
      v_waive := i.interest_due - i.interest_paid - i.interest_waived;
    end if;
    v_pen  := least(v_rem, i.penalty_due - i.penalty_paid);  v_rem := v_rem - v_pen;
    v_int  := least(v_rem, i.interest_due - i.interest_paid - i.interest_waived - v_waive); v_rem := v_rem - v_int;
    v_prin := least(v_rem, i.principal_due - i.principal_paid); v_rem := v_rem - v_prin;
    if v_pen + v_int + v_prin + v_waive = 0 then continue; end if;
    if i.principal_paid + v_prin = i.principal_due and i.interest_paid + v_int + i.interest_waived + v_waive = i.interest_due
       and i.penalty_paid + v_pen = i.penalty_due then v_new_status := 'paid';
    elsif i.due_date + s.grace_days < v_today then v_new_status := 'overdue';
    else v_new_status := 'partial'; end if;
    update repayment_schedules set principal_paid = principal_paid + v_prin, interest_paid = interest_paid + v_int,
           penalty_paid = penalty_paid + v_pen, interest_waived = interest_waived + v_waive, status = v_new_status,
           paid_at = case when v_new_status = 'paid' then now() end where id = i.id;
    alloc := alloc || jsonb_build_object('installment_no', i.installment_no, 'penalty', v_pen, 'interest', v_int, 'principal', v_prin, 'interest_waived', v_waive);
    t_pen := t_pen + v_pen; t_int := t_int + v_int; t_prin := t_prin + v_prin;
  end loop;
  if v_rem <> 0 then raise exception 'ALLOCATION_ERROR: reliquat non affecté (%)', v_rem; end if;
  v_kind := case when p_early_full then 'early_full' when p_amount >= v_target then 'regular' else 'partial' end;
  v_pi := t_prin + t_int;
  insert into payment_transactions(type, provider, status, amount, payer_id, loan_id, country_code, idempotency_key, is_simulation)
  values ('repayment','simulation','succeeded', p_amount, v, l.id, l.country_code, 'rep-col-'||p_idempotency_key, true) returning id into col;
  if v_pi > 0 then
    insert into payment_transactions(type, provider, status, amount, payee_id, loan_id, country_code, idempotency_key, is_simulation)
    values ('payout','simulation','succeeded', v_pi, l.lender_id, l.id, l.country_code, 'rep-pay-'||p_idempotency_key, true) returning id into pay;
  end if;
  perform post_journal('[SIMULATION] Remboursement encaissé — crédit #'||l.loan_no, 'repayment', l.id, l.id, l.country_code, true,
    'jr-rep-col-'||p_idempotency_key, jsonb_build_array(
      jsonb_build_object('account','1010','debit',p_amount,'user_id',l.borrower_id),
      jsonb_build_object('account','2100','credit',v_pi,'user_id',l.lender_id),
      jsonb_build_object('account','4020','credit',t_pen)));
  if v_pi > 0 then
    perform post_journal('[SIMULATION] Reversement au prêteur — crédit #'||l.loan_no, 'repayment', l.id, l.id, l.country_code, true,
      'jr-rep-pay-'||p_idempotency_key, jsonb_build_array(
        jsonb_build_object('account','2100','debit',v_pi,'user_id',l.lender_id),
        jsonb_build_object('account','1010','credit',v_pi,'user_id',l.lender_id)));
  end if;
  insert into repayments(loan_id, payer_id, amount, kind, allocation, principal_part, interest_part, penalty_part,
      collection_txn_id, payout_txn_id, idempotency_key)
  values (l.id, v, p_amount, v_kind, alloc, t_prin, t_int, t_pen, col, pay, p_idempotency_key) returning * into rp;
  select count(*) into v_left from repayment_schedules where loan_id = l.id and status <> 'paid';
  update loans set amount_repaid = amount_repaid + v_pi, penalties_paid = penalties_paid + t_pen,
         status = case when v_left = 0 then 'repaid'
                       when not exists (select 1 from repayment_schedules where loan_id = l.id and status = 'overdue') then 'active'
                       else status end,
         closed_at = case when v_left = 0 then now() end
   where id = l.id;
  perform _notify(l.borrower_id, 'repayment_recorded', '[DÉMO] Remboursement enregistré', format('%s FCFA (simulation).', p_amount), jsonb_build_object('loan_id', l.id), true, false);
  perform _notify(l.lender_id, 'repayment_received', '[DÉMO] Remboursement reçu', format('%s FCFA reçus (simulation).', v_pi), jsonb_build_object('loan_id', l.id));
  if v_left = 0 then
    perform _notify(l.borrower_id, 'loan_closed', 'Crédit soldé', 'Félicitations, votre crédit est entièrement remboursé.', jsonb_build_object('loan_id', l.id), true, true);
    perform _notify(l.lender_id, 'loan_closed', 'Crédit soldé', 'Le crédit est entièrement remboursé.', jsonb_build_object('loan_id', l.id));
  end if;
  return jsonb_build_object('repayment_id', rp.id, 'amount', p_amount, 'kind', v_kind, 'allocation', alloc, 'loan_closed', v_left = 0, 'simulation', true);
end $$;

-- ---------- Retards & rappels (tâches planifiées) -----------------------------
-- Appel : service_role / pg_cron, ou finance_manager/super_admin manuellement.
create or replace function refresh_overdue(p_today date default null) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare i record; n int := 0; v_today date; v_pen bigint;
begin
  if auth.uid() is not null and not has_any_role(array['super_admin','finance_manager']::app_role[]) then
    raise exception 'FORBIDDEN: droits insuffisants' using errcode = '42501'; end if;
  for i in
    select rs.*, l.country_code, l.borrower_id, l.loan_no, s.grace_days, s.late_fee_bps
      from repayment_schedules rs join loans l on l.id = rs.loan_id join country_settings s on s.country_code = l.country_code
     where rs.status in ('pending','partial') and l.status in ('active','overdue') for update of rs
  loop
    v_today := coalesce(p_today, _country_today(i.country_code));
    if i.due_date + i.grace_days < v_today then
      v_pen := case when i.penalty_due = 0
                 then round(((i.principal_due - i.principal_paid) + (i.interest_due - i.interest_paid)) * i.late_fee_bps / 10000.0)::bigint else 0 end;
      update repayment_schedules set status = 'overdue', penalty_due = penalty_due + v_pen where id = i.id;
      update loans set status = 'overdue', penalties_accrued = penalties_accrued + v_pen where id = i.loan_id;
      perform _notify(i.borrower_id, 'installment_overdue', 'Échéance en retard',
        format('L''échéance n°%s du crédit #%s est en retard. Une pénalité de %s FCFA s''applique.', i.installment_no, i.loan_no, v_pen),
        jsonb_build_object('loan_id', i.loan_id), true, true);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function send_installment_reminders(p_today date default null) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare i record; n int := 0; v_today date;
begin
  if auth.uid() is not null and not has_any_role(array['super_admin','finance_manager']::app_role[]) then
    raise exception 'FORBIDDEN: droits insuffisants' using errcode = '42501'; end if;
  for i in
    select rs.id, rs.loan_id, rs.installment_no, rs.due_date, rs.principal_due + rs.interest_due as due, l.borrower_id, l.country_code
      from repayment_schedules rs join loans l on l.id = rs.loan_id
     where rs.status in ('pending','partial') and l.status = 'active' for update of rs
  loop
    v_today := coalesce(p_today, _country_today(i.country_code));
    if i.due_date - v_today in (0, 1, 3) and i.reminder_sent_on is distinct from v_today then
      update repayment_schedules set reminder_sent_on = v_today where id = i.id;
      perform _notify(i.borrower_id, 'installment_reminder', 'Rappel d''échéance',
        format('Échéance n°%s de %s FCFA le %s.', i.installment_no, i.due, to_char(i.due_date,'DD/MM/YYYY')),
        jsonb_build_object('loan_id', i.loan_id), true, true);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------- Opérations support / admin ----------------------------------------
create or replace function set_loan_status(p_loan_id uuid, p_status loan_status, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','credit_agent','compliance_officer']::app_role[]); l loans;
begin
  if coalesce(trim(p_reason),'') = '' then raise exception 'REASON_REQUIRED: motif obligatoire'; end if;
  if p_status not in ('defaulted','in_dispute','active','overdue') then raise exception 'INVALID_STATE: statut non autorisé'; end if;
  select * into l from loans where id = p_loan_id for update;
  if not found then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  if l.status in ('repaid','cancelled') then raise exception 'INVALID_STATE: crédit clôturé'; end if;
  update loans set status = p_status where id = l.id;
  perform write_audit('loan_status_change', 'loans', l.id::text, jsonb_build_object('status', l.status), jsonb_build_object('status', p_status), jsonb_build_object('reason', p_reason, 'by', v));
end $$;

create or replace function update_dispute(p_id uuid, p_status dispute_status, p_resolution text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','support','compliance_officer']::app_role[]); d disputes;
begin
  select * into d from disputes where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: litige introuvable'; end if;
  if p_status in ('resolved','rejected') and coalesce(trim(p_resolution),'') = '' then raise exception 'REASON_REQUIRED: résolution obligatoire'; end if;
  update disputes set status = p_status, resolution = coalesce(p_resolution, resolution), assigned_to = coalesce(assigned_to, v),
         resolved_at = case when p_status in ('resolved','rejected') then now() end where id = p_id;
  perform _notify(d.opened_by, 'dispute_update', 'Mise à jour de votre litige', coalesce(p_resolution, 'Statut : ' || p_status::text));
end $$;

create or replace function admin_set_user_status(p_user uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','support','compliance_officer']::app_role[]);
begin
  if p_status not in ('active','suspended','closed') then raise exception 'INVALID_STATE: statut invalide'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'REASON_REQUIRED: motif obligatoire'; end if;
  if p_user = v then raise exception 'FORBIDDEN: action sur soi-même interdite'; end if;
  if has_role(p_user, 'super_admin') and not has_role(v, 'super_admin') then raise exception 'FORBIDDEN: droits insuffisants' using errcode='42501'; end if;
  update profiles set status = p_status where id = p_user;
  perform write_audit('user_status_change', 'profiles', p_user::text, null, jsonb_build_object('status', p_status), jsonb_build_object('reason', p_reason));
end $$;

create or replace function admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _require_role(array['super_admin','compliance_officer','credit_agent','finance_manager','accountant','support','auditor']::app_role[]);
  return jsonb_build_object(
    'simulation_mode', not exists (select 1 from country_settings where payments_live_enabled),
    'users_total', (select count(*) from profiles),
    'kyc_pending', (select count(*) from kyc_submissions where status = 'pending'),
    'requests_pending_review', (select count(*) from loan_requests where status = 'pending_review'),
    'requests_open', (select count(*) from loan_requests where status = 'open'),
    'offers_pending_review', (select count(*) from funding_offers where status = 'pending_review'),
    'offers_active', (select count(*) from funding_offers where status = 'active'),
    'loans_active', (select count(*) from loans where status = 'active'),
    'loans_overdue', (select count(*) from loans where status = 'overdue'),
    'loans_awaiting_disbursement', (select count(*) from loans where status = 'awaiting_disbursement'),
    'principal_outstanding', coalesce((select sum(rs.principal_due - rs.principal_paid) from repayment_schedules rs join loans l on l.id = rs.loan_id where l.status in ('active','overdue')),0),
    'volume_disbursed', coalesce((select sum(gross_amount) from disbursements where status = 'succeeded'),0),
    'fees_revenue', coalesce((select balance from ledger_balances where code = '4010'),0),
    'penalty_revenue', coalesce((select balance from ledger_balances where code = '4020'),0),
    'disputes_open', (select count(*) from disputes where status in ('open','investigating','escalated')),
    'approvals_pending', (select count(*) from approval_requests where status = 'pending'),
    'overdue_over_default_threshold', (select count(distinct rs.loan_id) from repayment_schedules rs join loans l on l.id = rs.loan_id
        join country_settings s on s.country_code = l.country_code where rs.status = 'overdue' and rs.due_date < current_date - s.default_after_days));
end $$;

-- Verrouillage des fonctions : exécutables uniquement par les utilisateurs connectés (et service_role)
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f' and p.proname !~ '^(calc_schedule|effective_annual_rate_bps)$'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;
