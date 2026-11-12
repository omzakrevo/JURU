-- =============================================================================
-- JURU — 0013 Circuit de paiement : fonctions
--   simulation : tout est immédiat, rien n'est envoyé (comportement historique, inchangé)
--   sandbox    : SAS Pay avec clé sk_test_ (aucun argent réel) ; l'état n'avance qu'APRÈS confirmation vérifiée côté serveur
--   live       : refusé (LIVE_PAYMENTS_NOT_IMPLEMENTED) tant que le projet n'est pas validé juridiquement
-- Les fonctions « service » ne sont exécutables que par service_role (worker serveur), jamais par un utilisateur.
-- =============================================================================

create or replace function payment_mode(p_country text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case when payments_live_enabled then 'live' when payments_sandbox_enabled then 'sandbox' else 'simulation' end
    from country_settings where country_code = p_country
$$;
create or replace function get_payment_mode(p_country text default 'BF') returns text
language sql stable security definer set search_path = public, pg_temp as $$ select coalesce(payment_mode(p_country), 'simulation') $$;

create or replace function _ledger_tag(p_mode text) returns text language sql immutable as
$$ select case p_mode when 'sandbox' then '[TEST SAS PAY]' else '[SIMULATION]' end $$;

-- Garde-fou : « réel » interdit sans activation ; « sandbox » exige l'activation du mode test et le fournisseur SAS Pay
create or replace function guard_live_payments() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare s country_settings;
begin
  select * into s from country_settings where country_code = new.country_code;
  if new.mode = 'live' or not new.is_simulation then
    if not coalesce(s.payments_live_enabled, false) then
      raise exception 'PAIEMENTS RÉELS DÉSACTIVÉS pour le pays % : seule la simulation/le mode test est autorisé', new.country_code using errcode = '42501';
    end if;
  elsif new.mode = 'sandbox' then
    if not coalesce(s.payments_sandbox_enabled, false) then
      raise exception 'MODE TEST SAS PAY DÉSACTIVÉ pour le pays %', new.country_code using errcode = '42501'; end if;
    if new.provider <> 'sas_pay' then raise exception 'Le mode test exige le fournisseur sas_pay'; end if;
  end if;
  return new;
end $$;

-- ---------- Solde de remboursement anticipé (sans contrôle d'accès : usage interne) ----------
create or replace function _payoff(p_loan_id uuid) returns bigint
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare l loans; v_today date;
begin
  select * into l from loans where id = p_loan_id;
  v_today := _country_today(l.country_code);
  return coalesce((select sum((principal_due - principal_paid) + (penalty_due - penalty_paid)
            + case when due_date <= v_today then interest_due - interest_paid - interest_waived else 0 end)
          from repayment_schedules where loan_id = p_loan_id and status <> 'paid'), 0);
end $$;
create or replace function get_payoff_amount(p_loan_id uuid) returns bigint
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); l loans;
begin
  select * into l from loans where id = p_loan_id;
  if not found or (v <> l.borrower_id and not is_staff()) then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  return _payoff(p_loan_id);
end $$;

create or replace function _outstanding(p_loan_id uuid) returns bigint
language sql stable as $$
  select coalesce(sum((principal_due-principal_paid)+(interest_due-interest_paid-interest_waived)+(penalty_due-penalty_paid)),0)
    from repayment_schedules where loan_id = p_loan_id and status <> 'paid'
$$;

create or replace function _validate_repayment(p_loan loans, p_amount bigint, p_early boolean) returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_loan.status not in ('active','overdue') then raise exception 'INVALID_STATE: crédit non remboursable (statut %)', p_loan.status; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'AMOUNT_INVALID: montant invalide'; end if;
  if p_early then
    if p_amount <> _payoff(p_loan.id) then raise exception 'PAYOFF_MISMATCH: le solde de remboursement anticipé est de % FCFA', _payoff(p_loan.id); end if;
  elsif p_amount > _outstanding(p_loan.id) then
    raise exception 'AMOUNT_TOO_HIGH: montant supérieur au solde restant dû';
  end if;
end $$;

-- ---------- Imputation d'un remboursement (cœur commun simulation / test) ----------
create or replace function _apply_repayment(p_loan_id uuid, p_payer uuid, p_amount bigint, p_key text, p_early boolean,
                                            p_mode text, p_collection_txn uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare l loans; s country_settings; v_today date; rp repayments; i repayment_schedules;
        v_rem bigint; v_pen bigint; v_int bigint; v_prin bigint; t_pen bigint := 0; t_int bigint := 0; t_prin bigint := 0;
        alloc jsonb := '[]'; v_target bigint; v_kind text; col uuid := p_collection_txn; pay uuid; v_pi bigint;
        v_left int; v_new_status installment_status; v_waive bigint; v_early boolean := p_early; v_out bigint;
        v_amount bigint := p_amount; v_excess bigint := 0; v_tag text := _ledger_tag(p_mode); v_lender_ch text;
begin
  select * into l from loans where id = p_loan_id for update;
  select * into s from country_settings where country_code = l.country_code;
  v_today := _country_today(l.country_code);
  -- En mode test, l'état a pu évoluer entre l'intention et la confirmation : on s'adapte sans bloquer ni perdre d'argent.
  if v_early and p_amount <> _payoff(l.id) then v_early := false; end if;
  v_out := _outstanding(l.id);
  if v_amount > v_out then v_excess := v_amount - v_out; v_amount := v_out; end if;
  select (principal_due-principal_paid)+(interest_due-interest_paid-interest_waived)+(penalty_due-penalty_paid) into v_target
    from repayment_schedules where loan_id = l.id and status <> 'paid' order by installment_no limit 1;
  v_rem := v_amount;
  for i in select * from repayment_schedules where loan_id = l.id and status <> 'paid' order by installment_no for update loop
    exit when v_rem <= 0 and not (v_early and i.due_date > v_today);
    v_waive := 0;
    if v_early and i.due_date > v_today then v_waive := i.interest_due - i.interest_paid - i.interest_waived; end if;
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
  v_kind := case when v_early then 'early_full' when v_amount >= coalesce(v_target,0) then 'regular' else 'partial' end;
  v_pi := t_prin + t_int;

  if p_mode = 'simulation' then
    insert into payment_transactions(type, provider, status, amount, payer_id, loan_id, country_code, idempotency_key, is_simulation)
    values ('repayment','simulation','succeeded', p_amount, p_payer, l.id, l.country_code, 'rep-col-'||p_key, true) returning id into col;
    if v_pi > 0 then
      insert into payment_transactions(type, provider, status, amount, payee_id, loan_id, country_code, idempotency_key, is_simulation)
      values ('payout','simulation','succeeded', v_pi, l.lender_id, l.id, l.country_code, 'rep-pay-'||p_key, true) returning id into pay;
    end if;
  end if;

  perform post_journal(v_tag||' Remboursement encaissé — crédit #'||l.loan_no, 'repayment', l.id, l.id, l.country_code, true,
    'jr-rep-col-'||p_key, jsonb_build_array(
      jsonb_build_object('account','1010','debit',p_amount,'user_id',l.borrower_id),
      jsonb_build_object('account','2100','credit',v_pi,'user_id',l.lender_id),
      jsonb_build_object('account','4020','credit',t_pen),
      jsonb_build_object('account','2300','credit',v_excess,'user_id',l.borrower_id)));
  if v_excess > 0 then
    perform write_audit('repayment_excess', 'loans', l.id::text, null, jsonb_build_object('excess', v_excess), jsonb_build_object('key', p_key));
  end if;
  if p_mode = 'simulation' and v_pi > 0 then
    perform post_journal(v_tag||' Reversement au prêteur — crédit #'||l.loan_no, 'repayment', l.id, l.id, l.country_code, true,
      'jr-rep-pay-'||p_key, jsonb_build_array(
        jsonb_build_object('account','2100','debit',v_pi,'user_id',l.lender_id),
        jsonb_build_object('account','1010','credit',v_pi,'user_id',l.lender_id)));
  end if;

  insert into repayments(loan_id, payer_id, amount, kind, allocation, principal_part, interest_part, penalty_part,
      collection_txn_id, payout_txn_id, idempotency_key, is_simulation)
  values (l.id, p_payer, v_amount, v_kind, alloc, t_prin, t_int, t_pen, col, pay, p_key, true) returning * into rp;
  update payment_transactions set repayment_id = rp.id where id in (col, pay);

  if p_mode = 'sandbox' and v_pi > 0 then   -- reversement au prêteur : initié ici, exécuté par le worker, comptabilisé à confirmation
    select mobile_money_channel into v_lender_ch from profiles where id = l.lender_id;
    insert into payment_transactions(type, provider, status, amount, payee_id, loan_id, country_code, idempotency_key,
        is_simulation, mode, purpose, repayment_id, channel)
    values ('payout','sas_pay','initiated', v_pi, l.lender_id, l.id, l.country_code, 'rep-pay-'||p_key,
        true, 'sandbox', 'repayment_payout', rp.id, v_lender_ch) returning id into pay;
    update repayments set payout_txn_id = pay where id = rp.id;
  end if;

  select count(*) into v_left from repayment_schedules where loan_id = l.id and status <> 'paid';
  update loans set amount_repaid = amount_repaid + v_pi, penalties_paid = penalties_paid + t_pen,
         status = case when v_left = 0 then 'repaid'
                       when not exists (select 1 from repayment_schedules where loan_id = l.id and status = 'overdue') then 'active'
                       else status end,
         closed_at = case when v_left = 0 then now() end
   where id = l.id;
  perform _notify(l.borrower_id, 'repayment_recorded', case p_mode when 'sandbox' then '[TEST] ' else '[DÉMO] ' end || 'Remboursement enregistré',
    format('%s FCFA (%s).', v_amount, case p_mode when 'sandbox' then 'mode test, aucun argent réel' else 'simulation' end), jsonb_build_object('loan_id', l.id), true, false);
  perform _notify(l.lender_id, 'repayment_received', case p_mode when 'sandbox' then '[TEST] ' else '[DÉMO] ' end || 'Remboursement reçu',
    format('%s FCFA reçus (%s).', v_pi, case p_mode when 'sandbox' then 'mode test' else 'simulation' end), jsonb_build_object('loan_id', l.id));
  if v_left = 0 then
    perform _notify(l.borrower_id, 'loan_closed', 'Crédit soldé', 'Félicitations, votre crédit est entièrement remboursé.', jsonb_build_object('loan_id', l.id), true, true);
    perform _notify(l.lender_id, 'loan_closed', 'Crédit soldé', 'Le crédit est entièrement remboursé.', jsonb_build_object('loan_id', l.id));
  end if;
  return jsonb_build_object('repayment_id', rp.id, 'amount', v_amount, 'excess', v_excess, 'kind', v_kind, 'allocation', alloc,
                            'loan_closed', v_left = 0, 'simulation', p_mode = 'simulation', 'mode', p_mode);
end $$;

-- API historique : uniquement en mode simulation
create or replace function record_repayment(p_loan_id uuid, p_amount bigint, p_idempotency_key text, p_early_full boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); l loans; rp repayments; m text;
begin
  if coalesce(trim(p_idempotency_key),'') = '' then raise exception 'IDEMPOTENCY_KEY_REQUIRED: clé d''idempotence requise'; end if;
  select * into rp from repayments where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('repayment_id', rp.id, 'amount', rp.amount, 'idempotent_replay', true); end if;
  select * into l from loans where id = p_loan_id for update;
  if not found or (v <> l.borrower_id and not is_staff()) then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  m := payment_mode(l.country_code);
  if m = 'live' then raise exception 'LIVE_PAYMENTS_NOT_IMPLEMENTED: paiements réels non activés'; end if;
  if m = 'sandbox' then raise exception 'USE_PAYMENT_FLOW: en mode test SAS Pay, utilisez le parcours de paiement (start_repayment_intent)'; end if;
  perform _validate_repayment(l, p_amount, p_early_full);
  return _apply_repayment(l.id, v, p_amount, p_idempotency_key, p_early_full, 'simulation', null);
end $$;

-- ---------- Décaissement ----------
create or replace function request_disbursement(p_loan_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','finance_manager','credit_agent']::app_role[]);
        l loans; d uuid; ap uuid; m text;
begin
  select * into l from loans where id = p_loan_id for update;
  if not found then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  if l.status <> 'awaiting_disbursement' then raise exception 'INVALID_STATE: crédit non décaissable'; end if;
  if exists (select 1 from disbursements where loan_id = l.id and status not in ('failed','rejected','cancelled')) then
    raise exception 'ALREADY_REQUESTED: décaissement déjà demandé'; end if;
  m := payment_mode(l.country_code);
  if m = 'live' then raise exception 'LIVE_PAYMENTS_NOT_IMPLEMENTED: paiements réels non activés'; end if;
  if m = 'sandbox' and not exists (select 1 from profiles where id = l.borrower_id and mobile_money_channel is not null and phone is not null) then
    raise exception 'BORROWER_PAYOUT_CHANNEL_MISSING: l''emprunteur doit renseigner son moyen Mobile Money (profil) avant le décaissement'; end if;
  insert into disbursements(loan_id, lender_id, borrower_id, country_code, gross_amount, fee_amount, net_amount, requested_by)
  values (l.id, l.lender_id, l.borrower_id, l.country_code, l.principal, l.fee_total, l.principal - l.fee_total, v)
  returning id into d;
  insert into approval_requests(action_type, entity_type, entity_id, payload, requested_by)
  values ('disbursement', 'disbursements', d, jsonb_build_object('loan_id', l.id, 'net_amount', l.principal - l.fee_total, 'simulation', true, 'mode', m), v)
  returning id into ap;
  update disbursements set approval_request_id = ap where id = d;
  return ap;
end $$;

-- Clôture d'un décaissement : 2e écriture, échéancier, crédit actif
create or replace function _finalize_disbursement(p_disb_id uuid, p_mode text, p_collection uuid, p_payout uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare d disbursements; l loans; c loan_contracts; v_today date; e jsonb; v_tag text := _ledger_tag(p_mode);
begin
  select * into d from disbursements where id = p_disb_id for update;
  select * into l from loans where id = d.loan_id for update;
  select * into c from loan_contracts where id = l.contract_id;
  if l.status <> 'awaiting_disbursement' then raise exception 'INVALID_STATE: crédit non décaissable'; end if;
  perform post_journal(v_tag||' Décaissement à l''emprunteur — crédit #'||l.loan_no, 'disbursement', d.id, l.id, l.country_code, true,
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
  update disbursements set status = 'succeeded', executed_at = now(), collection_txn_id = p_collection, payout_txn_id = p_payout where id = d.id;
  perform _notify(d.borrower_id, 'disbursement_done', case p_mode when 'sandbox' then '[TEST] Fonds versés (mode test)' else '[DÉMO] Fonds décaissés (simulation)' end,
    format('%s FCFA nets ont été « versés » (%s).', d.net_amount, case p_mode when 'sandbox' then 'mode test, aucun argent réel' else 'mode démonstration' end),
    jsonb_build_object('loan_id', l.id), true, true);
  perform _notify(d.lender_id, 'disbursement_done', case p_mode when 'sandbox' then '[TEST] Décaissement effectué' else '[DÉMO] Décaissement effectué (simulation)' end,
    'Le crédit est actif. Échéancier disponible.', jsonb_build_object('loan_id', l.id));
end $$;

create or replace function _execute_disbursement(p_disb_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare d disbursements; l loans; m text; col uuid; pay uuid; v_tag text;
begin
  select * into d from disbursements where id = p_disb_id for update;
  select * into l from loans where id = d.loan_id for update;
  m := payment_mode(l.country_code);
  if m = 'live' then raise exception 'LIVE_PAYMENTS_NOT_IMPLEMENTED: paiements réels non activés'; end if;
  if l.status <> 'awaiting_disbursement' then raise exception 'INVALID_STATE: crédit non décaissable'; end if;
  if m = 'sandbox' then
    update disbursements set status = 'awaiting_funding' where id = d.id;
    perform _notify(d.lender_id, 'funding_required', '[TEST] Fonds à verser', format('Versez %s FCFA (mode test) pour finaliser le crédit.', d.gross_amount),
      jsonb_build_object('disbursement_id', d.id, 'loan_id', l.id), true, true);
    return;
  end if;
  v_tag := _ledger_tag('simulation');
  insert into payment_transactions(type, provider, status, amount, payer_id, payee_id, loan_id, country_code, idempotency_key, is_simulation)
  values ('collection','simulation','succeeded', d.gross_amount, d.lender_id, null, l.id, l.country_code, 'disb-col-'||d.id, true) returning id into col;
  insert into payment_transactions(type, provider, status, amount, fee_amount, payer_id, payee_id, loan_id, country_code, idempotency_key, is_simulation)
  values ('disbursement','simulation','succeeded', d.net_amount, d.fee_amount, null, d.borrower_id, l.id, l.country_code, 'disb-pay-'||d.id, true) returning id into pay;
  perform post_journal(v_tag||' Collecte des fonds du prêteur — crédit #'||l.loan_no, 'disbursement', d.id, l.id, l.country_code, true,
    'jr-disb-col-'||d.id, jsonb_build_array(
      jsonb_build_object('account','1010','debit',d.gross_amount,'user_id',d.lender_id),
      jsonb_build_object('account','2100','credit',d.gross_amount,'user_id',d.lender_id)));
  perform _finalize_disbursement(d.id, 'simulation', col, pay);
end $$;

-- ---------- Démarrage d'une collecte (utilisateur) : crée la transaction « initiated », l'appel API est fait par le serveur ----------
create or replace function begin_collection(p_purpose text, p_ref uuid, p_channel text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); d disbursements; it repayment_intents; l loans; t payment_transactions; m text; ph text;
begin
  if p_channel not in ('orange_money','moov_money') then raise exception 'INVALID_CHANNEL: choisissez Orange Money ou Moov Money'; end if;
  select phone into ph from profiles where id = v;
  if ph is null then raise exception 'PHONE_REQUIRED: numéro de téléphone requis'; end if;
  if p_purpose = 'disbursement' then
    select * into d from disbursements where id = p_ref for update;
    if not found or d.lender_id <> v then raise exception 'NOT_FOUND: décaissement introuvable'; end if;
    m := payment_mode(d.country_code);
    if m <> 'sandbox' then raise exception 'MODE_NOT_SANDBOX: collecte disponible uniquement en mode test SAS Pay'; end if;
    select * into t from payment_transactions where idempotency_key = 'disb-col-'||d.id;
    if not found then
      if d.status <> 'awaiting_funding' then raise exception 'INVALID_STATE: ce décaissement n''attend pas de fonds'; end if;
      insert into payment_transactions(type, provider, status, amount, payer_id, loan_id, country_code, idempotency_key,
          is_simulation, mode, purpose, disbursement_id, channel, msisdn_masked)
      values ('collection','sas_pay','initiated', d.gross_amount, v, d.loan_id, d.country_code, 'disb-col-'||d.id,
          true, 'sandbox', 'disbursement_collect', d.id, p_channel, left(ph,4)||' •• •• '||right(ph,2)) returning * into t;
      update disbursements set status = 'funding_in_progress', collection_txn_id = t.id where id = d.id;
    end if;
  elsif p_purpose = 'repayment' then
    select * into it from repayment_intents where id = p_ref for update;
    if not found or it.payer_id <> v then raise exception 'NOT_FOUND: intention introuvable'; end if;
    select * into l from loans where id = it.loan_id;
    m := payment_mode(l.country_code);
    if m <> 'sandbox' then raise exception 'MODE_NOT_SANDBOX: paiement disponible uniquement en mode test SAS Pay'; end if;
    select * into t from payment_transactions where idempotency_key = 'rep-col-'||it.idempotency_key;
    if not found then
      if it.status <> 'created' then raise exception 'INVALID_STATE: intention déjà traitée'; end if;
      insert into payment_transactions(type, provider, status, amount, payer_id, loan_id, country_code, idempotency_key,
          is_simulation, mode, purpose, repayment_intent_id, channel, msisdn_masked)
      values ('repayment','sas_pay','initiated', it.amount, v, l.id, l.country_code, 'rep-col-'||it.idempotency_key,
          true, 'sandbox', 'repayment_collect', it.id, p_channel, left(ph,4)||' •• •• '||right(ph,2)) returning * into t;
      update repayment_intents set status = 'collecting', collection_txn_id = t.id where id = it.id;
    end if;
  else
    raise exception 'INVALID_PURPOSE: objet de collecte inconnu';
  end if;
  update profiles set mobile_money_channel = coalesce(mobile_money_channel, p_channel) where id = v;  -- servira au reversement
  return jsonb_build_object('txn_id', t.id, 'idempotency_key', t.idempotency_key, 'amount', t.amount, 'channel', t.channel,
    'payer_phone', ph, 'reference', t.purpose || ':' || coalesce(t.disbursement_id, t.repayment_intent_id)::text,
    'status', t.status, 'provider_reference', t.provider_reference, 'checkout_url', t.checkout_url);
end $$;

create or replace function start_repayment_intent(p_loan_id uuid, p_amount bigint, p_idempotency_key text, p_early_full boolean default false)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_user(); l loans; it repayment_intents;
begin
  if coalesce(trim(p_idempotency_key),'') = '' then raise exception 'IDEMPOTENCY_KEY_REQUIRED: clé d''idempotence requise'; end if;
  select * into it from repayment_intents where idempotency_key = p_idempotency_key;
  if found then
    if it.payer_id <> v then raise exception 'NOT_FOUND: intention introuvable'; end if;
    return it.id;
  end if;
  select * into l from loans where id = p_loan_id for update;
  if not found or l.borrower_id <> v then raise exception 'NOT_FOUND: crédit introuvable'; end if;
  if payment_mode(l.country_code) <> 'sandbox' then raise exception 'MODE_NOT_SANDBOX: paiement disponible uniquement en mode test SAS Pay'; end if;
  perform _validate_repayment(l, p_amount, p_early_full);
  insert into repayment_intents(loan_id, payer_id, amount, early_full, idempotency_key)
  values (l.id, v, p_amount, p_early_full, p_idempotency_key) returning * into it;
  return it.id;
end $$;

-- ---------- Machine d'états des transactions (interne) ----------
create or replace function _apply_txn_status(p_txn_id uuid, p_status text, p_raw jsonb, p_reason text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t payment_transactions; d disbursements; l loans; it repayment_intents; rp repayments; res jsonb; pay uuid; ch text;
begin
  if p_status not in ('succeeded','failed','cancelled','pending') then raise exception 'INVALID_STATUS: statut inconnu'; end if;
  select * into t from payment_transactions where id = p_txn_id for update;
  if not found then raise exception 'NOT_FOUND: transaction introuvable'; end if;
  if t.mode <> 'sandbox' then raise exception 'MODE_UNSUPPORTED: seul le mode test est pris en charge'; end if;
  if t.status in ('succeeded','failed','cancelled','reversed') then          -- état terminal : idempotence, jamais de régression
    if t.status::text <> p_status and p_status <> 'pending' then
      perform write_audit('payment_status_conflict', 'payment_transactions', t.id::text, jsonb_build_object('status', t.status),
        jsonb_build_object('reported', p_status), jsonb_build_object('reason', p_reason));
    end if;
    return jsonb_build_object('noop', true, 'status', t.status);
  end if;
  if p_status = 'pending' then
    update payment_transactions set last_verified_at = now() where id = t.id;
    return jsonb_build_object('noop', true, 'status', t.status);
  end if;
  update payment_transactions set status = p_status::payment_txn_status, last_verified_at = now(),
         raw_response = coalesce(p_raw, raw_response), failure_reason = case when p_status <> 'succeeded' then left(coalesce(p_reason, p_status), 200) end,
         reconciliation_status = case when p_status = 'succeeded' then 'matched' else reconciliation_status end
   where id = t.id returning * into t;

  if t.purpose = 'disbursement_collect' then
    select * into d from disbursements where id = t.disbursement_id for update;
    select * into l from loans where id = d.loan_id;
    if p_status = 'succeeded' then
      perform post_journal('[TEST SAS PAY] Collecte des fonds du prêteur — crédit #'||l.loan_no, 'disbursement', d.id, l.id, l.country_code, true,
        'jr-disb-col-'||d.id, jsonb_build_array(
          jsonb_build_object('account','1010','debit',d.gross_amount,'user_id',d.lender_id),
          jsonb_build_object('account','2100','credit',d.gross_amount,'user_id',d.lender_id)));
      select mobile_money_channel into ch from profiles where id = d.borrower_id;
      insert into payment_transactions(type, provider, status, amount, fee_amount, payee_id, loan_id, country_code, idempotency_key,
          is_simulation, mode, purpose, disbursement_id, channel)
      values ('disbursement','sas_pay','initiated', d.net_amount, d.fee_amount, d.borrower_id, l.id, l.country_code, 'disb-pay-'||d.id,
          true, 'sandbox', 'disbursement_payout', d.id, ch) returning id into pay;
      update disbursements set status = 'paying_out', collection_txn_id = t.id, payout_txn_id = pay where id = d.id;
      perform _notify(d.lender_id, 'funding_received', '[TEST] Fonds reçus', 'Votre versement est confirmé ; le crédit va être décaissé.', jsonb_build_object('loan_id', l.id));
    else
      update disbursements set status = 'failed' where id = d.id;
      perform _notify(d.lender_id, 'funding_failed', '[TEST] Versement non abouti', 'Le paiement n''a pas abouti. Le décaissement pourra être redemandé.', jsonb_build_object('loan_id', l.id), true, false);
      perform write_audit('disbursement_collection_failed', 'disbursements', d.id::text, null, jsonb_build_object('status', p_status), jsonb_build_object('reason', p_reason));
    end if;
  elsif t.purpose = 'disbursement_payout' then
    select * into d from disbursements where id = t.disbursement_id for update;
    if p_status = 'succeeded' then
      perform _finalize_disbursement(d.id, 'sandbox', d.collection_txn_id, t.id);
    else   -- fonds collectés mais non versés : intervention humaine (restitution au prêteur ou nouvelle tentative)
      update disbursements set status = 'payout_failed' where id = d.id;
      perform write_audit('disbursement_payout_failed', 'disbursements', d.id::text, null, jsonb_build_object('status', p_status), jsonb_build_object('reason', p_reason));
      perform _notify(d.requested_by, 'payout_failed', '[TEST] Versement emprunteur échoué', 'Les fonds du prêteur sont collectés : décision manuelle requise (restitution ou nouvel essai).', jsonb_build_object('disbursement_id', d.id));
    end if;
  elsif t.purpose = 'repayment_collect' then
    select * into it from repayment_intents where id = t.repayment_intent_id for update;
    if p_status = 'succeeded' then
      res := _apply_repayment(it.loan_id, it.payer_id, it.amount, it.idempotency_key, it.early_full, 'sandbox', t.id);
      update repayment_intents set status = 'applied', repayment_id = (res->>'repayment_id')::uuid where id = it.id;
    else
      update repayment_intents set status = 'failed', failure_reason = left(coalesce(p_reason, p_status), 200) where id = it.id;
      select * into l from loans where id = it.loan_id;
      perform _notify(it.payer_id, 'repayment_failed', '[TEST] Paiement non abouti', 'Votre paiement n''a pas abouti. Aucune somme n''a été imputée.', jsonb_build_object('loan_id', l.id), true, false);
    end if;
  elsif t.purpose = 'repayment_payout' then
    select * into rp from repayments where id = t.repayment_id;
    if p_status = 'succeeded' then
      select * into l from loans where id = rp.loan_id;
      perform post_journal('[TEST SAS PAY] Reversement au prêteur — crédit #'||l.loan_no, 'repayment', l.id, l.id, l.country_code, true,
        'jr-rep-pay-'||rp.idempotency_key, jsonb_build_array(
          jsonb_build_object('account','2100','debit',t.amount,'user_id',l.lender_id),
          jsonb_build_object('account','1010','credit',t.amount,'user_id',l.lender_id)));
    else
      update payment_transactions set reconciliation_status = 'mismatch' where id = t.id;
      perform write_audit('repayment_payout_failed', 'payment_transactions', t.id::text, null, jsonb_build_object('status', p_status), jsonb_build_object('reason', p_reason));
    end if;
  end if;
  return jsonb_build_object('applied', true, 'status', p_status, 'purpose', t.purpose);
end $$;

-- ---------- API « service » (worker serveur uniquement) ----------
create or replace function apply_payment_event(p_provider_reference text, p_status text, p_raw jsonb default null, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t payment_transactions;
begin
  select * into t from payment_transactions where provider = 'sas_pay' and provider_reference = p_provider_reference;
  if not found then raise exception 'NOT_FOUND: transaction inconnue pour cette référence'; end if;
  return _apply_txn_status(t.id, p_status, p_raw, p_reason);
end $$;

create or replace function record_gateway_response(p_txn uuid, p_provider_reference text, p_status text, p_checkout_url text, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t payment_transactions;
begin
  select * into t from payment_transactions where id = p_txn for update;
  if not found then raise exception 'NOT_FOUND: transaction introuvable'; end if;
  if t.status in ('initiated','pending') then
    update payment_transactions set provider_reference = coalesce(provider_reference, p_provider_reference),
           checkout_url = coalesce(p_checkout_url, checkout_url), raw_response = coalesce(p_raw, raw_response),
           status = 'pending' where id = p_txn;
  end if;
  if p_status in ('succeeded','failed','cancelled') then return _apply_txn_status(p_txn, p_status, p_raw, null); end if;
  return jsonb_build_object('stored', true);
end $$;

create or replace function record_gateway_failure(p_txn uuid, p_code text, p_message text, p_retryable boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t payment_transactions;
begin
  select * into t from payment_transactions where id = p_txn for update;
  if not found then raise exception 'NOT_FOUND: transaction introuvable'; end if;
  if p_retryable and t.attempts < 5 then
    update payment_transactions set claimed_at = null, failure_reason = left(p_code||': '||p_message, 200) where id = p_txn;
    return jsonb_build_object('retry', true);
  end if;
  return _apply_txn_status(p_txn, 'failed', jsonb_build_object('code', p_code), p_code||': '||p_message);
end $$;

create or replace function claim_gateway_calls(p_limit int default 20)
returns table(call_txn_id uuid, call_kind text, call_amount bigint, call_key text, call_channel text, call_msisdn text, call_reference text, call_country text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
  with c as (
    select t.id from payment_transactions t
     where t.mode = 'sandbox' and t.status = 'initiated' and t.provider_reference is null
       and t.purpose in ('disbursement_payout','repayment_payout') and t.attempts < 5
       and (t.claimed_at is null or t.claimed_at < now() - interval '2 minutes')
     order by t.created_at limit p_limit for update skip locked),
  u as (update payment_transactions t set claimed_at = now(), attempts = t.attempts + 1 from c where t.id = c.id returning t.*)
  select u.id, 'disburse'::text, u.amount, u.idempotency_key, u.channel,
         (select p.phone from profiles p where p.id = u.payee_id),
         u.purpose || ':' || coalesce(u.disbursement_id, u.repayment_id)::text, u.country_code
    from u;
end $$;

-- Collectes jamais soumises au fournisseur (abandon utilisateur / panne) : annulées après 30 min
create or replace function expire_stale_collections() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare t record; n int := 0;
begin
  for t in select id from payment_transactions where mode = 'sandbox' and status = 'initiated' and provider_reference is null
             and purpose in ('disbursement_collect','repayment_collect') and created_at < now() - interval '30 minutes' for update skip locked
  loop
    perform _apply_txn_status(t.id, 'cancelled', null, 'expired_not_submitted');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- Droits d'exécution ----------
do $$
declare f text;
begin
  foreach f in array array[
    '_payoff(uuid)','_outstanding(uuid)','_validate_repayment(loans,bigint,boolean)','_apply_repayment(uuid,uuid,bigint,text,boolean,text,uuid)',
    '_finalize_disbursement(uuid,text,uuid,uuid)','_apply_txn_status(uuid,text,jsonb,text)',
    'apply_payment_event(text,text,jsonb,text)','record_gateway_response(uuid,text,text,text,jsonb)',
    'record_gateway_failure(uuid,text,text,boolean)','claim_gateway_calls(int)','expire_stale_collections()']
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['apply_payment_event(text,text,jsonb,text)','record_gateway_response(uuid,text,text,text,jsonb)',
    'record_gateway_failure(uuid,text,text,boolean)','claim_gateway_calls(int)','expire_stale_collections()']
  loop
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['payment_mode(text)','get_payment_mode(text)','begin_collection(text,uuid,text)','start_repayment_intent(uuid,bigint,text,boolean)']
  loop
    execute format('revoke execute on function %s from public, anon', f);
  end loop;
  foreach f in array array['get_payment_mode(text)','begin_collection(text,uuid,text)','start_repayment_intent(uuid,bigint,text,boolean)']
  loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  revoke execute on function payment_mode(text) from authenticated;
  revoke execute on function _ledger_tag(text) from public, anon, authenticated;
end $$;
