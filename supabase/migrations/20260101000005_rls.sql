-- =============================================================================
-- KREDIA — 0005 Row Level Security, privilèges minimaux, vues contrôlées
-- Principe : lecture filtrée par RLS ; ÉCRITURE sensible uniquement via RPC SECURITY DEFINER.
-- =============================================================================

-- ---------- 1. RLS activée partout -------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['countries','country_settings','profiles','user_roles','partner_accounts',
    'kyc_submissions','kyc_reviews','borrower_profiles','lender_profiles','loan_requests','guarantees',
    'funding_offers','loan_applications','loan_contracts','loans','repayment_schedules',
    'payment_transactions','payment_webhook_events','disbursements','repayments','platform_fees',
    'ledger_accounts','ledger_journals','ledger_entries','notifications','device_tokens','disputes',
    'audit_logs','approval_requests']
  loop
    execute format('alter table %I enable row level security', t);
    -- Défense en profondeur : aucun droit d'écriture direct par défaut pour les rôles API
    execute format('revoke insert, update, delete, truncate on %I from anon, authenticated', t);
    execute format('revoke all on %I from anon', t);
  end loop;
end $$;

-- Les rôles anonymes ne lisent que les référentiels publics
grant select on countries, country_settings to anon;

-- ---------- 2. Référentiels ---------------------------------------------------
create policy countries_read on countries for select to anon, authenticated using (true);
create policy country_settings_read on country_settings for select to anon, authenticated using (true);
create policy platform_fees_read on platform_fees for select to authenticated using (is_active or is_staff());

-- ---------- 3. Profils --------------------------------------------------------
create policy profiles_select_own on profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_staff on profiles for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','credit_agent','finance_manager','support','auditor']::app_role[]));
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Colonnes modifiables par l'utilisateur lui-même (kyc_status, status, id : jamais)
grant update (full_name, birth_date, city, address, account_type, business_name,
  business_registration_no, preferred_locale, is_borrower, is_lender, consent_terms_at,
  consent_privacy_at, country_code) on profiles to authenticated;

create policy user_roles_select_own on user_roles for select to authenticated using (user_id = auth.uid());
create policy user_roles_select_staff on user_roles for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','auditor']::app_role[]));

create policy partner_select on partner_accounts for select to authenticated
  using (is_staff() or user_id = auth.uid());

create policy borrower_profiles_own on borrower_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy borrower_profiles_staff on borrower_profiles for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','credit_agent','auditor']::app_role[]));
grant select, insert, update on borrower_profiles to authenticated;

create policy lender_profiles_own on lender_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lender_profiles_staff on lender_profiles for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','credit_agent','auditor']::app_role[]));
grant select, insert, update on lender_profiles to authenticated;

-- ---------- 4. KYC ------------------------------------------------------------
create policy kyc_select_own on kyc_submissions for select to authenticated using (user_id = auth.uid());
create policy kyc_select_staff on kyc_submissions for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','auditor']::app_role[]));
create policy kyc_reviews_select_staff on kyc_reviews for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','auditor']::app_role[]));

-- ---------- 5. Marché ---------------------------------------------------------
create policy loan_requests_own on loan_requests for select to authenticated using (borrower_id = auth.uid());
create policy loan_requests_staff on loan_requests for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','credit_agent','auditor','support']::app_role[]));
create policy guarantees_select on guarantees for select to authenticated
  using (exists (select 1 from loan_requests r where r.id = loan_request_id
                 and (r.borrower_id = auth.uid()
                      or has_any_role(array['super_admin','compliance_officer','credit_agent','auditor']::app_role[]))));

create policy funding_offers_select on funding_offers for select to authenticated
  using (status = 'active' or lender_id = auth.uid()
         or has_any_role(array['super_admin','compliance_officer','credit_agent','auditor','support']::app_role[]));

create policy applications_parties on loan_applications for select to authenticated
  using (borrower_id = auth.uid() or lender_id = auth.uid() or is_staff());

-- ---------- 6. Contrats, crédits, remboursements -----------------------------
create policy contracts_parties on loan_contracts for select to authenticated
  using (borrower_id = auth.uid() or lender_id = auth.uid() or is_staff());
create policy loans_parties on loans for select to authenticated
  using (borrower_id = auth.uid() or lender_id = auth.uid() or is_staff());
create policy schedules_parties on repayment_schedules for select to authenticated
  using (exists (select 1 from loans l where l.id = loan_id
                 and (l.borrower_id = auth.uid() or l.lender_id = auth.uid() or is_staff())));
create policy repayments_parties on repayments for select to authenticated
  using (exists (select 1 from loans l where l.id = loan_id
                 and (l.borrower_id = auth.uid() or l.lender_id = auth.uid() or is_staff())));

-- ---------- 7. Paiements & comptabilité (personnel financier) ----------------
create policy payment_txn_parties on payment_transactions for select to authenticated
  using (payer_id = auth.uid() or payee_id = auth.uid()
         or has_any_role(array['super_admin','finance_manager','accountant','auditor','support']::app_role[]));
create policy webhook_events_staff on payment_webhook_events for select to authenticated
  using (has_any_role(array['super_admin','finance_manager','accountant','auditor']::app_role[]));
create policy disbursements_select on disbursements for select to authenticated
  using (borrower_id = auth.uid() or lender_id = auth.uid()
         or has_any_role(array['super_admin','finance_manager','credit_agent','accountant','auditor']::app_role[]));

create policy ledger_accounts_select on ledger_accounts for select to authenticated
  using (has_any_role(array['super_admin','finance_manager','accountant','auditor']::app_role[]));
create policy ledger_journals_select on ledger_journals for select to authenticated
  using (has_any_role(array['super_admin','finance_manager','accountant','auditor']::app_role[]));
create policy ledger_entries_select on ledger_entries for select to authenticated
  using (has_any_role(array['super_admin','finance_manager','accountant','auditor']::app_role[]));
grant select on ledger_balances to authenticated;

-- ---------- 8. Notifications, appareils, litiges, audit, validations ----------
create policy notifications_own on notifications for select to authenticated using (user_id = auth.uid());

create policy device_tokens_own on device_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on device_tokens to authenticated;

create policy disputes_select on disputes for select to authenticated
  using (opened_by = auth.uid() or against_user_id = auth.uid()
         or has_any_role(array['super_admin','compliance_officer','support','auditor']::app_role[]));
create policy disputes_insert on disputes for insert to authenticated
  with check (opened_by = auth.uid() and status = 'open' and exists (
    select 1 from loans l where l.id = loan_id and (l.borrower_id = auth.uid() or l.lender_id = auth.uid())));
grant insert on disputes to authenticated;

create policy audit_logs_select on audit_logs for select to authenticated
  using (has_any_role(array['super_admin','compliance_officer','auditor']::app_role[]));
create policy approvals_select on approval_requests for select to authenticated
  using (has_any_role(array['super_admin','finance_manager','compliance_officer','auditor']::app_role[])
         or requested_by = auth.uid());

-- ---------- 9. Vues contrôlées (exécutées avec les droits du propriétaire) ----
-- Fiche contrepartie : prénom + initiale, jamais le téléphone ni l'adresse.
create or replace view counterparty_cards as
select p.id,
       trim(split_part(coalesce(p.full_name,'Utilisateur'),' ',1) || ' ' ||
            coalesce(left(nullif(split_part(coalesce(p.full_name,''),' ',2),''),1) || '.', '')) as display_name,
       p.country_code, p.city, (p.kyc_status = 'approved') as kyc_verified, p.created_at as member_since
from profiles p
where p.id = auth.uid() or is_staff()
   or p.id in (select lender_id from loan_applications where borrower_id = auth.uid()
               union select borrower_id from loan_applications where lender_id = auth.uid()
               union select lender_id from loans where borrower_id = auth.uid()
               union select borrower_id from loans where lender_id = auth.uid());
grant select on counterparty_cards to authenticated;

-- Marché des demandes : visible uniquement par les prêteurs vérifiés ; aucune donnée d'identité sensible.
create or replace view marketplace_requests as
select r.id, r.country_code, r.amount, r.purpose, r.purpose_details, r.duration_months,
       r.max_annual_rate_bps,
       case when r.risk_score <= 25 then 'A' when r.risk_score <= 50 then 'B' when r.risk_score <= 75 then 'C' else 'D' end as risk_grade,
       trim(split_part(coalesce(b.full_name,'Emprunteur'),' ',1) || ' ' ||
            coalesce(left(nullif(split_part(coalesce(b.full_name,''),' ',2),''),1) || '.', '')) as borrower_display,
       (b.kyc_status = 'approved') as borrower_kyc_verified,
       coalesce((select g.type::text from guarantees g where g.loan_request_id = r.id order by g.created_at limit 1), 'none') as guarantee_type,
       r.published_at, r.expires_at
from loan_requests r join profiles b on b.id = r.borrower_id
where r.status = 'open' and r.borrower_id <> auth.uid()
  and (is_staff() or exists (select 1 from profiles me where me.id = auth.uid()
                             and me.is_lender and me.kyc_status = 'approved' and me.country_code = r.country_code));
grant select on marketplace_requests to authenticated;
