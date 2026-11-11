-- Sécurité : RLS, privilèges, immuabilité, double validation, garde-fous, règles métier
\set AWA  '00000000-0000-4000-8000-0000000000b1'
\set ISS  '00000000-0000-4000-8000-0000000000b2'
\set FAT  '00000000-0000-4000-8000-0000000000b3'
\set BOU  '00000000-0000-4000-8000-0000000000b4'
\set ADM1 '00000000-0000-4000-8000-0000000000a1'
\set ADM2 '00000000-0000-4000-8000-0000000000a2'
\set COMP '00000000-0000-4000-8000-0000000000a3'
\set CRED '00000000-0000-4000-8000-0000000000a4'
\set FIN  '00000000-0000-4000-8000-0000000000a5'
\set AUD  '00000000-0000-4000-8000-0000000000a7'

-- ===== Règles métier (rôle postgres + JWT simulé) =====
select t.act(:'ISS');   -- Issouf : KYC en attente => pas d'emprunt
select t.expect_error('select submit_loan_request(20000,''commerce'',''x'',3,1800,200000,50000,0)', 'KYC_REQUIRED');
select t.act(:'AWA');
select t.expect_error('select submit_loan_request(4000,''commerce'',''x'',3,1800,200000,50000,0)', 'AMOUNT_OUT_OF_RANGE');
select t.expect_error('select submit_loan_request(600000,''commerce'',''x'',3,1800,200000,50000,0)', 'AMOUNT_OUT_OF_RANGE');
select t.expect_error('select submit_loan_request(20000,''commerce'',''x'',3,9999,200000,50000,0)', 'RATE_OUT_OF_RANGE');
select t.expect_error('select publish_funding_offer(''x'',100000,5000,50000,1,6,1000)', 'ROLE_NOT_ENABLED');   -- Awa n'est pas prêteur
select t.act(:'FAT');
select t.expect_error('select submit_loan_request(20000,''commerce'',''x'',3,1800,200000,50000,0)', 'ROLE_NOT_ENABLED'); -- Fatimata n'est pas emprunteuse

-- Acceptation sans confirmation du coût total : refusée
select t.act(:'BOU');
do $$
declare req uuid; a loan_applications;
begin
  select id into req from loan_requests where amount = 30000 and status = 'open';
  a := propose_application(req, null, 1500, 'test');
  perform set_config('t.app', a.id::text, false);
  perform t.act('00000000-0000-4000-8000-0000000000b1');
  perform t.expect_error(format('select respond_application(%L, true, 1)', a.id), 'TOTAL_COST_NOT_ACKNOWLEDGED');
  perform t.expect_error(format('select respond_application(%L, true, null)', a.id), 'TOTAL_COST_NOT_ACKNOWLEDGED');
  -- un prêteur ne peut pas proposer deux fois, ni répondre à la place de l'emprunteur
  perform t.act('00000000-0000-4000-8000-0000000000b4');
  perform t.expect_error(format('select propose_application(%L, null, 1500)', req), 'ALREADY_PROPOSED');
  perform t.expect_error(format('select respond_application(%L, true, %s)', a.id, a.total_cost), 'NOT_FOUND');
  assert a.total_cost > 0 and a.quote ? 'installments', 'devis complet fourni avant acceptation';
end $$;

-- Cycle 2 : demande de Boukary financée par Fatimata ; double validation du décaissement
select t.act(:'FAT');
do $$
declare req uuid; a loan_applications; ct uuid; ap uuid; lid uuid;
begin
  select id into req from loan_requests where amount = 400000 and status = 'open';
  a := propose_application(req, null, 2000, 'cycle 2');
  perform t.act('00000000-0000-4000-8000-0000000000b4');
  ct := respond_application(a.id, true, a.total_cost);
  assert ct is not null, 'contrat créé';
  assert (select status from loan_requests where id = req) = 'accepted', 'demande acceptée';
  -- signature : consentement obligatoire ; signature double
  perform t.expect_error(format('select sign_contract(%L, false)', ct), 'CONSENT_REQUIRED');
  perform sign_contract(ct, true, '{"otp_verified":true}');
  assert (select status from loan_contracts where id = ct) = 'partially_signed';
  perform t.expect_error(format('select sign_contract(%L, true)', ct), 'ALREADY_SIGNED');
  perform t.act('00000000-0000-4000-8000-0000000000b3');
  perform t.expect_error(format('select request_disbursement(%L)', (select id from loans limit 1)), 'FORBIDDEN');
  perform sign_contract(ct, true, '{"otp_verified":true}');
  select id into lid from loans where contract_id = ct;
  assert (select status from loans where id = lid) = 'awaiting_disbursement', 'crédit créé après double signature';
  -- Aucun changement rétroactif sur un contrat signé
  perform t.expect_error(format('update loan_contracts set principal = 1000 where id = %L', ct), 'immuables');
  perform t.expect_error(format('update loan_contracts set status = ''cancelled'' where id = %L', ct), 'modification interdite');
  perform t.expect_error(format('delete from loan_contracts where id = %L', ct), 'supprimé');
  -- Double validation
  perform t.act('00000000-0000-4000-8000-0000000000a5');
  ap := request_disbursement(lid);
  perform t.expect_error(format('select decide_approval(%L, true)', ap), 'SELF_APPROVAL_FORBIDDEN');
  perform t.act('00000000-0000-4000-8000-0000000000a4');   -- agent crédit : pas autorisé à approuver
  perform t.expect_error(format('select decide_approval(%L, true)', ap), 'FORBIDDEN');
  assert (select status from loans where id = lid) = 'awaiting_disbursement', 'aucun décaissement sans double validation';
  perform t.act('00000000-0000-4000-8000-0000000000a1');
  perform decide_approval(ap, true, 'ok');
  assert (select status from loans where id = lid) = 'active', 'actif après approbation';
  assert (select count(*) from repayment_schedules where loan_id = lid) = 12, 'échéancier 12 mois';
  assert (select net_amount from disbursements where loan_id = lid) = 400000 - 8000, 'net = capital - commission 2%';
  perform t.expect_error(format('select request_disbursement(%L)', lid), 'INVALID_STATE');
end $$;

-- Attribution de rôle : double validation entre deux super-admins
select t.act(:'ADM1');
do $$
declare ap uuid;
begin
  ap := request_role_grant('00000000-0000-4000-8000-0000000000b2', 'support');
  perform t.expect_error(format('select decide_approval(%L, true)', ap), 'SELF_APPROVAL_FORBIDDEN');
  perform t.act('00000000-0000-4000-8000-0000000000a2');
  perform decide_approval(ap, true);
  assert has_role('00000000-0000-4000-8000-0000000000b2', 'support'), 'rôle accordé après double validation';
  delete from user_roles where user_id = '00000000-0000-4000-8000-0000000000b2' and role = 'support';
end $$;

-- KYC : pas d'auto-validation, motif obligatoire
select t.act(:'COMP');
select t.expect_error(format('select review_kyc(%L, ''rejected'')', (select id from kyc_submissions where status = 'pending' limit 1)), 'REASON_REQUIRED');
select t.act(:'AWA');
select t.expect_error('select review_kyc(gen_random_uuid(), ''approved'')', 'FORBIDDEN');

-- Garde-fou paiements réels + immuabilité (rôle postgres)
select set_config('request.jwt.claims', '', false);
select t.expect_error($$insert into payment_transactions(type, provider, amount, country_code, idempotency_key, is_simulation)
   values ('collection','orange_money',1000,'BF','live-1',false)$$, 'PAIEMENTS RÉELS DÉSACTIVÉS');
select t.expect_error($$insert into payment_transactions(type, provider, amount, country_code, idempotency_key, is_simulation)
   values ('collection','simulation',1000,'BF','sim-x',false)$$, 'DÉSACTIVÉS');
select t.expect_error($$update ledger_entries set debit = debit + 1$$, 'immuable');
select t.expect_error($$delete from ledger_entries$$, 'immuable');
select t.expect_error($$delete from ledger_journals$$, 'immuable');
select t.expect_error($$delete from audit_logs$$, 'ajout seul');
select t.expect_error($$update audit_logs set action = 'x'$$, 'ajout seul');
do $$
declare j uuid;
begin
  -- écriture déséquilibrée : refusée à la validation de transaction
  begin
    insert into ledger_journals(description, country_code) values ('déséquilibré','BF') returning id into j;
    insert into ledger_entries(journal_id, account_id, debit) values (j, (select id from ledger_accounts where code='1010'), 100);
    insert into ledger_entries(journal_id, account_id, credit) values (j, (select id from ledger_accounts where code='2100'), 90);
    set constraints all immediate;
    raise exception 'écriture déséquilibrée acceptée !';
  exception when others then
    assert sqlerrm like '%déséquilibrée%' and sqlerrm not like '%acceptée%', 'écriture déséquilibrée doit être refusée: ' || sqlerrm;
  end;
  -- un seul côté (1 ligne) est refusé aussi
  begin
    insert into ledger_journals(description, country_code) values ('une ligne','BF') returning id into j;
    insert into ledger_entries(journal_id, account_id, debit) values (j, (select id from ledger_accounts where code='1010'), 100);
    set constraints all immediate;
    raise exception 'une ligne acceptée !';
  exception when others then
    assert sqlerrm not like '%acceptée%', 'une seule ligne doit être refusée: ' || sqlerrm;
  end;
  -- extourne : écritures inverses, équilibrées, une seule fois
  perform t.act('00000000-0000-4000-8000-0000000000a5');
  perform reverse_journal((select id from ledger_journals where reference_type = 'repayment' order by journal_no limit 1), 'test extourne');
  assert (select sum(debit) from ledger_entries) = (select sum(credit) from ledger_entries), 'ledger équilibré après extourne';
end $$;

-- ===== Row Level Security (rôles API réels) =====
select set_config('request.jwt.claims', '', false);
set role anon;
do $$ begin
  assert (select count(*) from countries) = 8, 'anon lit les pays';
  perform t.expect_error('select * from profiles', 'permission denied');
  perform t.expect_error('select * from loans', 'permission denied');
  perform t.expect_error('select * from marketplace_requests', 'permission denied');
  perform t.expect_error('select quote_loan(''BF'',50000,1000,3)', 'permission denied');
end $$;
reset role;

-- Awa (emprunteuse)
select t.act(:'AWA');
set role authenticated;
do $$
declare me uuid := auth.uid();
begin
  assert (select count(*) from profiles) = 1, 'Awa ne voit que son profil';
  assert (select count(*) from kyc_submissions where user_id <> me) = 0, 'pas de KYC des autres';
  assert (select count(*) from loan_requests where borrower_id <> me) = 0, 'pas les demandes des autres (table)';
  assert (select count(*) from ledger_entries) = 0 and (select count(*) from ledger_accounts) = 0, 'pas de ledger';
  assert (select count(*) from audit_logs) = 0, 'pas d''audit';
  assert (select count(*) from payment_webhook_events) = 0, 'pas de webhooks';
  assert (select count(*) from loans where borrower_id <> me) = 0, 'seulement ses crédits';
  assert (select count(*) from marketplace_requests) = 0, 'non-prêteur : pas d''accès au marché des demandes';
  assert (select count(*) from notifications where user_id <> me) = 0, 'seulement ses notifications';
  assert (select count(*) from notifications where user_id = me) > 0, 'a des notifications';
  perform t.expect_error('insert into loans(contract_id,borrower_id,lender_id,country_code,principal,annual_rate_bps,duration_months,interest_total,fee_total,total_repayable) values (gen_random_uuid(),auth.uid(),auth.uid(),''BF'',1,1,1,1,1,1)', 'permission denied');
  perform t.expect_error('insert into loan_requests(borrower_id,country_code,amount,purpose,duration_months,max_annual_rate_bps,monthly_income,monthly_expenses,repayment_capacity) values (auth.uid(),''BF'',10000,''other'',1,1,1,1,1)', 'permission denied');
  perform t.expect_error('update profiles set kyc_status = ''approved''', 'permission denied');
  perform t.expect_error('update profiles set status = ''active''', 'permission denied');
  perform t.expect_error('update loans set amount_repaid = 0', 'permission denied');
  perform t.expect_error('delete from repayments', 'permission denied');
  perform t.expect_error('insert into ledger_entries(journal_id,account_id,debit) values (gen_random_uuid(),gen_random_uuid(),1)', 'permission denied');
  perform t.expect_error('insert into user_roles(user_id, role) values (auth.uid(), ''super_admin'')', 'permission denied');
  perform t.expect_error('select post_journal(''x'',null,null,null,''BF'',true,null,''[]'')', 'permission denied');
  perform t.expect_error('select _execute_disbursement(gen_random_uuid())', 'permission denied');
  perform t.expect_error('select refresh_overdue()', 'FORBIDDEN');
  perform t.expect_error('select admin_dashboard_stats()', 'FORBIDDEN');
  update profiles set city = 'Bobo-Dioulasso' where id = me;   -- champ autorisé
  assert (select city from profiles where id = me) = 'Bobo-Dioulasso';
end $$;
reset role;

-- Issouf ne peut pas lire les données d'Awa ; Fatimata (prêteuse vérifiée) voit le marché sans données sensibles
select t.act(:'FAT');
set role authenticated;
do $$
declare cols text;
begin
  assert (select count(*) from marketplace_requests) >= 1, 'prêteur vérifié voit le marché';
  select string_agg(column_name, ',') into cols from information_schema.columns where table_name = 'marketplace_requests';
  assert cols not like '%borrower_id%' and cols not like '%monthly_income%' and cols not like '%phone%', 'le marché n''expose ni identité ni revenus: ' || cols;
  assert (select count(*) from loan_requests) = 0, 'pas d''accès direct aux demandes';
  assert (select count(*) from kyc_submissions where user_id <> auth.uid()) = 0, 'pas de KYC des autres';
  assert (select count(*) from loans where lender_id <> auth.uid()) = 0, 'seulement ses crédits prêtés';
  assert (select count(*) from counterparty_cards) >= 2, 'fiches contreparties visibles (relations)';
  assert (select max(length(display_name)) from counterparty_cards) < 40, 'noms abrégés';
end $$;
reset role;

select t.act(:'ISS');
set role authenticated;
do $$ begin
  assert (select count(*) from marketplace_requests) = 0, 'emprunteur non prêteur : marché fermé';
  assert (select count(*) from loan_contracts) = 0 and (select count(*) from repayment_schedules) = 0, 'aucun contrat/échéancier des autres';
  assert (select count(*) from funding_offers) >= 1, 'les offres actives sont consultables';
  assert (select count(*) from kyc_submissions) = 1, 'son propre KYC seulement';
end $$;
reset role;

-- Personnel : séparation des rôles
select t.act(:'COMP');
set role authenticated;
do $$ begin
  assert (select count(*) from kyc_submissions) >= 1, 'conformité lit les KYC';
  assert (select count(*) from audit_logs) > 0, 'conformité lit l''audit';
  assert (select count(*) from ledger_entries) = 0, 'conformité ne lit pas le ledger';
  perform t.expect_error('select review_loan_request(gen_random_uuid(), true)', 'FORBIDDEN');
end $$;
reset role;
select t.act(:'FIN');
set role authenticated;
do $$ begin
  assert (select count(*) from ledger_entries) > 0, 'finance lit le ledger';
  assert (select count(*) from kyc_submissions) = 0, 'finance ne lit pas les KYC';
  assert (select (admin_dashboard_stats()->>'simulation_mode')::boolean), 'dashboard : mode simulation actif';
  perform t.expect_error('delete from ledger_entries', 'permission denied');
end $$;
reset role;
select t.act(:'AUD');
set role authenticated;
do $$ begin
  assert (select count(*) from audit_logs) > 0 and (select count(*) from ledger_entries) > 0, 'auditeur lecture seule';
  perform t.expect_error('select review_kyc(gen_random_uuid(),''approved'')', 'FORBIDDEN');
  perform t.expect_error('select decide_approval(gen_random_uuid(), true)', 'NOT_FOUND');
end $$;
reset role;

-- Audit : les actions sensibles sont journalisées, sans chemins de documents KYC
do $$ begin
  assert (select count(*) from audit_logs where entity_type = 'loan_contracts') > 0, 'audit des contrats';
  assert (select count(*) from audit_logs where entity_type = 'approval_requests') > 0, 'audit des validations';
  assert not exists (select 1 from audit_logs where new_data ? 'front_path'), 'chemins KYC masqués dans l''audit';
end $$;

-- Politiques Storage : isolation par dossier utilisateur
select t.act(:'AWA');
set role authenticated;
do $$ begin
  insert into storage.objects(bucket_id, name, owner) values ('kyc-documents', auth.uid()::text || '/s9/front.jpg', auth.uid());
  perform t.expect_error($q$insert into storage.objects(bucket_id, name) values ('kyc-documents', '00000000-0000-4000-8000-0000000000b3/x/front.jpg')$q$, 'row-level security');
  assert (select count(*) from storage.objects where bucket_id = 'kyc-documents') = 1, 'ne voit que ses fichiers';
end $$;
reset role;
select t.act(:'COMP');
set role authenticated;
do $$ begin assert (select count(*) from storage.objects where bucket_id = 'kyc-documents') = 1, 'conformité lit les documents KYC'; end $$;
reset role;
select t.act(:'FIN');
set role authenticated;
do $$ begin assert (select count(*) from storage.objects where bucket_id = 'kyc-documents') = 0, 'finance ne lit pas les documents KYC'; end $$;
reset role;
