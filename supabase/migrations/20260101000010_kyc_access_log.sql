-- 0010 — Journalisation de l'accès aux documents KYC (chaque consultation est tracée)
create or replace function log_kyc_document_access(p_submission uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid := _require_role(array['super_admin','compliance_officer']::app_role[]);
begin
  perform write_audit('kyc_document_access', 'kyc_submissions', p_submission::text, null, null, jsonb_build_object('viewer', v));
end $$;
revoke execute on function log_kyc_document_access(uuid) from public, anon;
