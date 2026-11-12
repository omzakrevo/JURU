-- =============================================================================
-- JURU — 0008 Storage privé : documents KYC et contrats
-- Chemin imposé : {user_id}/... ; aucun accès public ; lecture personnel conformité uniquement.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc-documents', 'kyc-documents', false, 5242880, array['image/jpeg','image/png','application/pdf']),
       ('contracts',     'contracts',     false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- KYC : l'utilisateur dépose et relit SES fichiers ; pas de modification ni suppression
-- après dépôt (preuve) ; la conformité lit tout (accès journalisé côté application).
create policy kyc_objects_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy kyc_objects_select_own on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy kyc_objects_select_staff on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and has_any_role(array['super_admin','compliance_officer']::app_role[]));

-- Contrats : lisibles par les parties (dossier = id du contrat), écrits par le serveur (service_role).
create policy contracts_objects_select_parties on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and exists (
    select 1 from public.loan_contracts c
     where c.id::text = (storage.foldername(name))[1]
       and (c.borrower_id = auth.uid() or c.lender_id = auth.uid() or public.is_staff())));
