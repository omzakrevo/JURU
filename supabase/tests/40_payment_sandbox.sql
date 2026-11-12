-- Circuit de paiement en MODE TEST SAS Pay (aucun appel réseau : les réponses du fournisseur sont simulées par ce test)
\set AWA  '00000000-0000-4000-8000-0000000000b1'
\set FAT  '00000000-0000-4000-8000-0000000000b3'
\set BOU  '00000000-0000-4000-8000-0000000000b4'
\set ADM1 '00000000-0000-4000-8000-0000000000a1'
\set FIN  '00000000-0000-4000-8000-0000000000a5'
\set CRED '00000000-0000-4000-8000-0000000000a4'

-- ===== Prérequis : un crédit signé, en attente de décaissement (en mode simulation) =====
select set_config('request.jwt.claims', '', false);
select t.act(:'AWA');
select submit_loan_request(80000, 'commerce', 'Test circuit sandbox', 4, 2000, 250000, 90000, 0);
select t.act(:'FAT');
select propose_application((select id from loan_requests where amount = 80000 and status = 'open'), null, 1500, 'sandbox');
select t.act(:'AWA');
select respond_application(a.id, true, a.total_cost) from loan_applications a where a.principal = 80000 and a.status = 'proposed';
select sign_contract(c.id, true, '{}') from loan_contracts c where c.principal = 80000;
select t.act(:'FAT');
select sign_contract(c.id, true, '{}') from loan_contracts c where c.principal = 80000;

-- ===== Mode simulation : les parcours « test » sont refusés =====
select t.act(:'AWA');
select t.expect_error($$select start_repayment_intent((select id from loans where principal = 80000), 1000, 'k-sim', false)$$, 'MODE_NOT_SANDBOX');
select set_config('request.jwt.claims', '', false);
select t.expect_error($$insert into payment_transactions(type, provider, amount, country_code, idempotency_key, is_simulation, mode, purpose)
  values ('collection','sas_pay',1000,'BF','sb-off',true,'sandbox','disbursement_collect')$$, 'MODE TEST SAS PAY DÉSACTIVÉ');
select t.expect_error($$insert into payment_transactions(type, provider, amount, country_code, idempotency_key, is_simulation, mode)
  values ('collection','sas_pay',1000,'BF','live-x',true,'live')$$, 'DÉSACTIVÉS');

-- ===== Activation du mode test (intervention DBA, jamais depuis l'interface) =====
update country_settings set payments_sandbox_enabled = true where country_code = 'BF';
select t.expect_error($$update country_settings set payments_live_enabled = true where country_code = 'BF'$$, 'country_settings_one_mode');
do $$ begin assert payment_mode('BF') = 'sandbox'; end $$;

-- Prérequis du décaissement : l'emprunteur doit avoir un canal Mobile Money
select t.act(:'FIN');
select t.expect_error($$select request_disbursement((select id from loans where principal = 80000))$$, 'BORROWER_PAYOUT_CHANNEL_MISSING');
update profiles set mobile_money_channel = 'orange_money' where id = :'AWA';

-- Les anciens parcours simulés sont bloqués en mode test
select t.act(:'AWA');
select t.expect_error($$select record_repayment((select id from loans where principal = 80000), 1000, 'k-old', false)$$, 'USE_PAYMENT_FLOW');

-- ===== 1. Décaissement : double validation → collecte du prêteur (échec) → nouvelle demande → collecte OK → versement emprunteur =====
select t.act(:'FIN');
select request_disbursement(l.id) from loans l where l.principal = 80000;
select t.act(:'ADM1');
select decide_approval(a.id, true) from approval_requests a where a.action_type = 'disbursement' and a.status = 'pending';
do $$
declare l loans; d disbursements;
begin
  select * into l from loans where principal = 80000;
  select * into d from disbursements where loan_id = l.id and status = 'awaiting_funding';
  assert found, 'décaissement en attente des fonds du prêteur';
  assert l.status = 'awaiting_disbursement', 'crédit pas encore actif';
  assert not exists (select 1 from ledger_journals where loan_id = l.id), 'aucune écriture avant encaissement';
  assert exists (select 1 from notifications where type = 'funding_required'), 'le prêteur est notifié';
end $$;

-- droits : ni l'emprunteur ni un autre prêteur ne peuvent collecter à la place du prêteur
select t.act(:'AWA');
select t.expect_error($$select begin_collection('disbursement', (select id from disbursements where status = 'awaiting_funding'), 'orange_money')$$, 'NOT_FOUND');
select t.act(:'BOU');
select t.expect_error($$select begin_collection('disbursement', (select id from disbursements where status = 'awaiting_funding'), 'orange_money')$$, 'NOT_FOUND');
select t.act(:'FAT');
select t.expect_error($$select begin_collection('disbursement', (select id from disbursements where status = 'awaiting_funding'), 'paypal')$$, 'INVALID_CHANNEL');
select begin_collection('disbursement', (select id from disbursements where status = 'awaiting_funding'), 'orange_money');
do $$
declare t1 payment_transactions; r jsonb;
begin
  select * into t1 from payment_transactions where purpose = 'disbursement_collect';
  assert t1.status = 'initiated' and t1.mode = 'sandbox' and t1.provider = 'sas_pay' and t1.is_simulation, 'collecte initiée (mode test)';
  assert t1.amount = 80000 and t1.channel = 'orange_money', 'montant brut du prêt, canal choisi';
  -- rejeu (retry du serveur) : même transaction, aucune seconde collecte
  perform t.act('00000000-0000-4000-8000-0000000000b3');
  r := begin_collection('disbursement', t1.disbursement_id, 'orange_money');
  assert (r->>'txn_id')::uuid = t1.id and (select count(*) from payment_transactions where purpose = 'disbursement_collect') = 1, 'begin_collection idempotent';
  assert (select mobile_money_channel from profiles where id = t1.payer_id) = 'orange_money', 'canal mémorisé pour les reversements';
end $$;

-- le worker (service_role) enregistre la réponse du fournisseur : paiement en attente + lien de paiement
do $$
declare tx uuid; r jsonb;
begin
  select id into tx from payment_transactions where purpose = 'disbursement_collect';
  -- un utilisateur n'a pas accès aux fonctions « service »
  set local role authenticated;
  perform t.expect_error(format('select record_gateway_response(%L, ''ref-c1'', ''pending'', null, null)', tx), 'permission denied');
  perform t.expect_error('select apply_payment_event(''ref-c1'', ''succeeded'')', 'permission denied');
  perform t.expect_error('select claim_gateway_calls(10)', 'permission denied');
  perform t.expect_error('select expire_stale_collections()', 'permission denied');
  reset role;
  set local role service_role;
  r := record_gateway_response(tx, 'ref-c1', 'pending', 'https://pay.example/checkout/1', '{"id":"ref-c1"}');
  reset role;
  assert (select status from payment_transactions where id = tx) = 'pending', 'en attente de confirmation';
  assert (select checkout_url from payment_transactions where id = tx) = 'https://pay.example/checkout/1', 'lien de paiement stocké';
  -- échec de la collecte (client a refusé / expiré) : rien n'est comptabilisé
  set local role service_role;
  r := apply_payment_event('ref-c1', 'failed', '{"status":"FAILED"}', 'user_declined');
  -- rejeu et conflit : un statut terminal ne régresse jamais
  r := apply_payment_event('ref-c1', 'failed');
  assert (r->>'noop')::boolean, 'rejeu = no-op';
  r := apply_payment_event('ref-c1', 'succeeded');
  reset role;
  assert (r->>'noop')::boolean, 'un échec confirmé ne devient pas un succès';
  assert (select status from payment_transactions where id = tx) = 'failed', 'transaction reste échouée';
  assert exists (select 1 from audit_logs where action = 'payment_status_conflict'), 'conflit journalisé';
  assert (select status from disbursements where loan_id = (select id from loans where principal = 80000) order by created_at limit 1) = 'failed', 'décaissement échoué';
  assert (select status from loans where principal = 80000) = 'awaiting_disbursement', 'crédit inchangé';
  assert not exists (select 1 from ledger_journals where loan_id = (select id from loans where principal = 80000)), 'aucune écriture comptable';
end $$;

-- nouvelle demande de décaissement (autorisée après échec) puis succès complet
select t.act(:'FIN');
select request_disbursement(l.id) from loans l where l.principal = 80000;
select t.act(:'ADM1');
select decide_approval(a.id, true) from approval_requests a where a.action_type = 'disbursement' and a.status = 'pending';
select t.act(:'FAT');
select begin_collection('disbursement', (select id from disbursements where status = 'awaiting_funding'), 'orange_money');
do $$
declare tx uuid; r jsonb; pay payment_transactions; calls record; n int; lid uuid; d disbursements;
begin
  select id into lid from loans where principal = 80000;
  select id into tx from payment_transactions where purpose = 'disbursement_collect' and status = 'initiated';
  set local role service_role;
  perform record_gateway_response(tx, 'ref-c2', 'pending', null, null);
  r := apply_payment_event('ref-c2', 'succeeded', '{"status":"SUCCESS"}');   -- (le worker a revérifié via /payments/{id}/verify/)
  reset role;
  select * into d from disbursements where loan_id = lid and status = 'paying_out';
  assert found, 'collecte confirmée → versement emprunteur en cours';
  assert (select status from loans where id = lid) = 'awaiting_disbursement', 'crédit pas encore actif';
  assert (select balance from ledger_balances where code = '1010') is not null;
  select * into pay from payment_transactions where purpose = 'disbursement_payout';
  assert pay.status = 'initiated' and pay.amount = 78400 and pay.fee_amount = 1600 and pay.channel = 'orange_money', 'versement net (80000 - 2% de commission) initié';
  -- le worker réclame l'appel : une seule fois (claim), avec le téléphone du bénéficiaire
  set local role service_role;
  select count(*) into n from claim_gateway_calls(10);
  assert n = 1, 'un appel à effectuer';
  select count(*) into n from claim_gateway_calls(10);
  assert n = 0, 'un appel déjà réclamé n''est pas redistribué (pas de double versement)';
  perform record_gateway_failure(pay.id, 'network', 'timeout', true);       -- coupure réseau : on rejoue avec la MÊME clé
  select * into calls from claim_gateway_calls(10);
  assert calls.call_key = pay.idempotency_key and calls.call_msisdn = '+22600000011' and calls.call_channel = 'orange_money' and calls.call_country = 'BF', 'rejeu avec la même clé d''idempotence';
  perform record_gateway_response(pay.id, 'ref-p1', 'pending', null, null);
  r := apply_payment_event('ref-p1', 'succeeded');
  reset role;
  assert (select status from loans where id = lid) = 'active', 'crédit actif après versement confirmé';
  assert (select count(*) from repayment_schedules where loan_id = lid) = 4, 'échéancier créé';
  assert (select status from disbursements where id = d.id) = 'succeeded', 'décaissement réussi';
  assert (select sum(debit) - sum(credit) from ledger_entries where journal_id in (select id from ledger_journals where loan_id = lid and description like '[TEST SAS PAY]%')) = 0, 'écritures équilibrées';
  assert (select coalesce(sum(debit - credit),0) from ledger_entries e join ledger_accounts a on a.id = e.account_id where e.loan_id = lid and a.code = '1010') = 1600, 'il ne reste dans le compte partenaire que la commission';
  assert (select coalesce(sum(credit - debit),0) from ledger_entries e join ledger_accounts a on a.id = e.account_id where e.loan_id = lid and a.code = '2100') = 0, 'aucune dette envers le prêteur';
  assert (select count(*) from ledger_journals where loan_id = lid and is_simulation = false) = 0, 'aucune écriture marquée réelle';
  -- rejeu du même événement : aucun effet
  set local role service_role;
  r := apply_payment_event('ref-p1', 'succeeded');
  reset role;
  assert (r->>'noop')::boolean and (select count(*) from repayment_schedules where loan_id = lid) = 4, 'événement rejoué sans effet';
end $$;

-- ===== 2. Remboursement : intention → collecte → imputation seulement après confirmation → reversement au prêteur =====
select t.act(:'FAT');
select t.expect_error($$select start_repayment_intent((select id from loans where principal = 80000), 1000, 'k-x', false)$$, 'NOT_FOUND');
select t.act(:'AWA');
select t.expect_error($$select start_repayment_intent((select id from loans where principal = 80000), 99999999, 'k-big', false)$$, 'AMOUNT_TOO_HIGH');
select t.expect_error($$select start_repayment_intent((select id from loans where principal = 80000), 0, 'k-zero', false)$$, 'AMOUNT_INVALID');
select start_repayment_intent((select id from loans where principal = 80000), 20000, 'rep-a', false);
do $$
declare i uuid; r jsonb; tx uuid; lid uuid;
begin
  select id into lid from loans where principal = 80000;
  select start_repayment_intent(lid, 20000, 'rep-a', false) into i;       -- rejeu : même intention
  assert (select count(*) from repayment_intents where idempotency_key = 'rep-a') = 1, 'intention idempotente';
  r := begin_collection('repayment', i, 'moov_money');
  tx := (r->>'txn_id')::uuid;
  assert (select amount_repaid from loans where id = lid) = 0, 'rien n''est imputé avant confirmation';
  set local role service_role;
  perform record_gateway_response(tx, 'ref-r1', 'pending', 'https://pay.example/checkout/2', null);
  perform apply_payment_event('ref-r1', 'failed', null, 'insufficient_funds');
  reset role;
  assert (select status from repayment_intents where id = i) = 'failed', 'paiement échoué';
  assert (select amount_repaid from loans where id = lid) = 0 and not exists (select 1 from repayments where loan_id = lid), 'rien d''imputé après échec';
end $$;
-- nouvel essai, réussi
select start_repayment_intent((select id from loans where principal = 80000), 20000, 'rep-b', false);
do $$
declare i uuid; r jsonb; tx uuid; lid uuid; pay payment_transactions; rp repayments;
begin
  select id into lid from loans where principal = 80000;
  select id into i from repayment_intents where idempotency_key = 'rep-b';
  r := begin_collection('repayment', i, 'orange_money');
  tx := (r->>'txn_id')::uuid;
  set local role service_role;
  perform record_gateway_response(tx, 'ref-r2', 'pending', null, null);
  perform apply_payment_event('ref-r2', 'succeeded');
  reset role;
  select * into rp from repayments where idempotency_key = 'rep-b';
  assert found and rp.amount = 20000 and rp.principal_part + rp.interest_part + rp.penalty_part = 20000, 'imputation après confirmation';
  assert (select amount_repaid from loans where id = lid) = rp.principal_part + rp.interest_part, 'crédit mis à jour';
  select * into pay from payment_transactions where purpose = 'repayment_payout';
  assert pay.status = 'initiated' and pay.amount = rp.principal_part + rp.interest_part and pay.payee_id = (select lender_id from loans where id = lid), 'reversement au prêteur initié (hors pénalités)';
  -- tant que le reversement n'est pas confirmé, la comptabilité ne le montre pas
  assert (select coalesce(sum(credit - debit),0) from ledger_entries e join ledger_accounts a on a.id = e.account_id where e.loan_id = lid and a.code = '2100') = rp.principal_part + rp.interest_part, 'dette envers le prêteur en attente de reversement';
  set local role service_role;
  perform claim_gateway_calls(10);
  perform record_gateway_response(pay.id, 'ref-p2', 'pending', null, null);
  perform apply_payment_event('ref-p2', 'succeeded');
  reset role;
  assert (select coalesce(sum(credit - debit),0) from ledger_entries e join ledger_accounts a on a.id = e.account_id where e.loan_id = lid and a.code = '2100') = 0, 'reversement confirmé : dette soldée';
  assert (select sum(debit) from ledger_entries) = (select sum(credit) from ledger_entries), 'ledger global équilibré';
end $$;

-- ===== 3. Reprises, expiration, trop-perçu, échec de versement =====
do $$
declare i uuid; r jsonb; tx uuid; lid uuid; n int;
begin
  select id into lid from loans where principal = 80000;
  -- abandon : collecte jamais soumise au fournisseur → annulée après 30 min
  perform t.act('00000000-0000-4000-8000-0000000000b1');
  select start_repayment_intent(lid, 5000, 'rep-c', false) into i;
  r := begin_collection('repayment', i, 'orange_money');
  update payment_transactions set created_at = now() - interval '2 hours' where id = (r->>'txn_id')::uuid;
  set local role service_role;
  n := expire_stale_collections();
  reset role;
  assert n = 1 and (select status from repayment_intents where id = i) = 'failed', 'collecte abandonnée expirée';
  assert (select status from payment_transactions where id = (r->>'txn_id')::uuid) = 'cancelled';
end $$;
do $$
declare i uuid; r jsonb; tx uuid; lid uuid; pay payment_transactions; before_amt bigint;
begin
  select id into lid from loans where principal = 80000;
  perform t.act('00000000-0000-4000-8000-0000000000b1');
  -- versement au prêteur échoué : alerte comptable (rapprochement), pas de perte silencieuse
  select start_repayment_intent(lid, 10000, 'rep-d', false) into i;
  r := begin_collection('repayment', i, 'orange_money');
  tx := (r->>'txn_id')::uuid;
  set local role service_role;
  perform record_gateway_response(tx, 'ref-r4', 'pending', null, null);
  perform apply_payment_event('ref-r4', 'succeeded');
  select * into pay from payment_transactions where purpose = 'repayment_payout' and status = 'initiated';
  perform claim_gateway_calls(10);
  perform record_gateway_failure(pay.id, 'insufficient_balance', 'Solde disponible insuffisant.', false);   -- erreur métier non rejouable
  reset role;
  assert (select status from payment_transactions where id = pay.id) = 'failed' and (select reconciliation_status from payment_transactions where id = pay.id) = 'mismatch', 'versement échoué à rapprocher';
  assert exists (select 1 from audit_logs where action = 'repayment_payout_failed'), 'alerte journalisée';
  -- paiement dont le solde a changé entre-temps (trop-perçu) : jamais bloqué, excédent mis de côté
  select start_repayment_intent(lid, 10000, 'rep-e', false) into i;
  r := begin_collection('repayment', i, 'orange_money');
  tx := (r->>'txn_id')::uuid;
  select amount_repaid into before_amt from loans where id = lid;
  update repayment_intents set amount = amount where id = i;
  set local role service_role;
  perform record_gateway_response(tx, 'ref-r5', 'pending', null, null);
  perform apply_payment_event('ref-r5', 'succeeded');
  reset role;
  assert (select amount_repaid from loans where id = lid) > before_amt;
end $$;

-- ===== Retour à la simulation : le mode test est désactivable, le garde-fou revient =====
select set_config('request.jwt.claims', '', false);
update country_settings set payments_sandbox_enabled = false where country_code = 'BF';
select t.expect_error($$insert into payment_transactions(type, provider, amount, country_code, idempotency_key, is_simulation, mode, purpose)
  values ('collection','sas_pay',1000,'BF','sb-off2',true,'sandbox','repayment_collect')$$, 'MODE TEST SAS PAY DÉSACTIVÉ');
select t.expect_error($$insert into payment_transactions(type, provider, amount, country_code, idempotency_key, is_simulation, mode)
  values ('collection','sas_pay',1000,'BF','live-y',false,'live')$$, 'PAIEMENTS RÉELS DÉSACTIVÉS');
do $$ begin
  assert (select sum(debit) from ledger_entries) = (select sum(credit) from ledger_entries), 'ledger équilibré en fin de test';
  assert not exists (select 1 from payment_transactions where mode = 'live'), 'aucune transaction réelle';
end $$;
