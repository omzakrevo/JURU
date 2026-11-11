-- =============================================================================
-- KREDIA — Données de DÉMONSTRATION FICTIVES (développement uniquement)
-- Garde-fou : exécuter avec  set kredia.allow_demo = 'on';  (jamais en production)
-- Tous les noms, numéros et montants sont inventés. Mot de passe démo : voir DEMO_PASSWORD ci-dessous.
-- =============================================================================
do $$ begin
  if coalesce(current_setting('kredia.allow_demo', true), '') <> 'on' then
    raise exception 'Seed démo refusé : exécutez  set kredia.allow_demo = ''on'';  (environnement NON production uniquement)';
  end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function pg_temp.act(p_uid uuid) returns void language sql as
$$ select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, false) $$;

create or replace function pg_temp.mk_user(p_id uuid, p_email text, p_phone text, p_name text, p_role app_role default null)
returns void language plpgsql as $$
begin
  insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
      extensions.crypt('Kredia#Demo2026', extensions.gen_salt('bf')), now(), p_phone, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name, 'country_code', 'BF'), now(), now(), '', '', '', '');
  insert into auth.identities(user_id, provider_id, provider, identity_data, last_sign_in_at)
  values (p_id, p_id::text, 'email', jsonb_build_object('sub', p_id::text, 'email', p_email), now());
  if p_role is not null then insert into user_roles(user_id, role) values (p_id, p_role) on conflict do nothing; end if;
end $$;

-- ---------- Personnel (fictif) -------------------------------------------------
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a1','admin@kredia.demo',  '+22600000001','Admin Démo Un',        'super_admin');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a2','admin2@kredia.demo', '+22600000002','Admin Démo Deux',      'super_admin');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a3','conformite@kredia.demo','+22600000003','Conformité Démo',   'compliance_officer');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a4','credit@kredia.demo', '+22600000004','Agent Crédit Démo',    'credit_agent');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a5','finance@kredia.demo','+22600000005','Responsable Finance Démo','finance_manager');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a6','support@kredia.demo','+22600000006','Support Démo',        'support');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a7','audit@kredia.demo',  '+22600000007','Auditeur Démo',        'auditor');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000a8','compta@kredia.demo', '+22600000008','Comptable Démo',       'accountant');

-- ---------- Utilisateurs (fictifs) --------------------------------------------
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000b1','awa@kredia.demo',       '+22600000011','Awa Démo Ouédraogo');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000b2','issouf@kredia.demo',    '+22600000012','Issouf Démo Traoré');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000b3','fatimata@kredia.demo',  '+22600000013','Fatimata Démo Sawadogo');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000b4','boukary@kredia.demo',   '+22600000014','Boukary Démo Zongo');
select pg_temp.mk_user('00000000-0000-4000-8000-0000000000b5','salimata@kredia.demo',  '+22600000015','Salimata Démo Compaoré');

update profiles set birth_date = '1992-04-12', city = 'Ouagadougou', is_borrower = true,  is_lender = false, consent_terms_at = now(), consent_privacy_at = now() where id = '00000000-0000-4000-8000-0000000000b1';
update profiles set birth_date = '1995-09-30', city = 'Bobo-Dioulasso', is_borrower = true, is_lender = false, consent_terms_at = now(), consent_privacy_at = now() where id = '00000000-0000-4000-8000-0000000000b2';
update profiles set birth_date = '1985-01-20', city = 'Ouagadougou', is_borrower = false, is_lender = true,  consent_terms_at = now(), consent_privacy_at = now() where id = '00000000-0000-4000-8000-0000000000b3';
update profiles set birth_date = '1980-07-05', city = 'Koudougou',   is_borrower = true, is_lender = true,  consent_terms_at = now(), consent_privacy_at = now() where id = '00000000-0000-4000-8000-0000000000b4';
update profiles set birth_date = '1990-11-02', city = 'Ouagadougou', is_borrower = true, is_lender = false, account_type = 'business', business_name = 'Boutique Démo Compaoré', consent_terms_at = now(), consent_privacy_at = now() where id = '00000000-0000-4000-8000-0000000000b5';

insert into lender_profiles(user_id, risk_appetite, investment_experience, source_of_funds, max_exposure_per_loan) values
  ('00000000-0000-4000-8000-0000000000b3','moderate','some','Épargne salariale (fictif)', 300000),
  ('00000000-0000-4000-8000-0000000000b4','high','experienced','Revenus commerciaux (fictif)', 500000);

insert into partner_accounts(name, type, country_code, status, notes) values
  ('Partenaire Démo SFD (fictif)', 'sfd', 'BF', 'prospect', 'Aucun contrat signé — entité fictive de démonstration'),
  ('Opérateur Mobile Money Démo (fictif)', 'mobile_money_operator', 'BF', 'prospect', 'Orange Money / Moov Money : API non contractualisée');

-- ---------- KYC : soumission puis revue humaine --------------------------------
select pg_temp.act('00000000-0000-4000-8000-0000000000b1');
select submit_kyc('cnib','1234',current_date + 900,'00000000-0000-4000-8000-0000000000b1/s1/front.jpg','00000000-0000-4000-8000-0000000000b1/s1/back.jpg','00000000-0000-4000-8000-0000000000b1/s1/selfie.jpg',true);
select pg_temp.act('00000000-0000-4000-8000-0000000000b2');
select submit_kyc('cnib','5678',current_date + 900,'00000000-0000-4000-8000-0000000000b2/s1/front.jpg','00000000-0000-4000-8000-0000000000b2/s1/back.jpg','00000000-0000-4000-8000-0000000000b2/s1/selfie.jpg',true);
select pg_temp.act('00000000-0000-4000-8000-0000000000b3');
select submit_kyc('passport','9012',current_date + 1200,'00000000-0000-4000-8000-0000000000b3/s1/front.jpg',null,'00000000-0000-4000-8000-0000000000b3/s1/selfie.jpg',true);
select pg_temp.act('00000000-0000-4000-8000-0000000000b4');
select submit_kyc('cnib','3456',current_date + 900,'00000000-0000-4000-8000-0000000000b4/s1/front.jpg','00000000-0000-4000-8000-0000000000b4/s1/back.jpg','00000000-0000-4000-8000-0000000000b4/s1/selfie.jpg',true);
select pg_temp.act('00000000-0000-4000-8000-0000000000b5');
select submit_kyc('cnib','7890',current_date + 900,'00000000-0000-4000-8000-0000000000b5/s1/front.jpg','00000000-0000-4000-8000-0000000000b5/s1/back.jpg','00000000-0000-4000-8000-0000000000b5/s1/selfie.jpg',true);

select pg_temp.act('00000000-0000-4000-8000-0000000000a3');
select review_kyc(id, 'approved') from kyc_submissions where user_id in
  ('00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-0000000000b3','00000000-0000-4000-8000-0000000000b4');
select review_kyc(id, 'more_info_required', 'Photo du verso illisible, merci de renvoyer le document.') from kyc_submissions
  where user_id = '00000000-0000-4000-8000-0000000000b5';
-- b2 (Issouf) reste « pending » pour illustrer la file de conformité.

-- ---------- Offres ---------------------------------------------------------------
select pg_temp.act('00000000-0000-4000-8000-0000000000b3');
select publish_funding_offer('Prêt commerce – petits montants', 500000, 20000, 200000, 2, 9, 1800, array['commerce','agriculture']::loan_purpose[], false);
select pg_temp.act('00000000-0000-4000-8000-0000000000b4');
select publish_funding_offer('Offre souple 3-12 mois', 800000, 10000, 300000, 3, 12, 1500, '{}', false);
select publish_funding_offer('Offre éducation & santé', 300000, 5000, 100000, 1, 6, 1200, array['education','health']::loan_purpose[], false);

-- ---------- Demandes ---------------------------------------------------------------
select pg_temp.act('00000000-0000-4000-8000-0000000000b1');
select submit_loan_request(150000, 'commerce', 'Achat de stock pour mon étal de légumes (démo)', 6, 2000, 220000, 90000, 0);
select submit_loan_request(30000, 'education', 'Frais de scolarité (démo)', 3, 1800, 220000, 90000, 0);
-- Demande plus risquée → file d'examen humain
select pg_temp.act('00000000-0000-4000-8000-0000000000b4');
select submit_loan_request(400000, 'equipment', 'Achat d''un moulin (démo)', 12, 2200, 250000, 160000, 40000, 'collateral', 'Moto 125cc (démo)', 450000);

select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
select review_loan_request(id, true) from loan_requests where status = 'pending_review';

-- ---------- Cycle complet : proposition → contrat → signature → décaissement simulé ----
select pg_temp.act('00000000-0000-4000-8000-0000000000b3');
select propose_application(r.id, o.id, null, 'Bonjour, je peux vous financer (démo).')
  from loan_requests r, funding_offers o
 where r.amount = 150000 and o.lender_id = '00000000-0000-4000-8000-0000000000b3';

select pg_temp.act('00000000-0000-4000-8000-0000000000b1');
select respond_application(a.id, true, a.total_cost) from loan_applications a where a.status = 'proposed' and a.principal = 150000;
select sign_contract(c.id, true, '{"channel":"seed","otp_verified":true}') from loan_contracts c where c.principal = 150000;
select pg_temp.act('00000000-0000-4000-8000-0000000000b3');
select sign_contract(c.id, true, '{"channel":"seed","otp_verified":true}') from loan_contracts c where c.principal = 150000;

select pg_temp.act('00000000-0000-4000-8000-0000000000a5');
select request_disbursement(l.id) from loans l where l.principal = 150000;
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
select decide_approval(a.id, true, 'Démo : double validation') from approval_requests a where a.action_type = 'disbursement' and a.status = 'pending';

-- Un premier remboursement partiel (simulé)
select pg_temp.act('00000000-0000-4000-8000-0000000000b1');
select record_repayment(l.id, 20000, 'seed-rep-1') from loans l where l.principal = 150000;

select set_config('request.jwt.claims', '', false);
