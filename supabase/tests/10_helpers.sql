-- Helpers de test (base de test uniquement)
create schema if not exists t;
grant usage on schema t to authenticated, anon;
create or replace function t.act(p uuid) returns void language sql as
$$ select set_config('request.jwt.claims', json_build_object('sub', p, 'role','authenticated')::text, false) $$;
create or replace function t.expect_error(p_sql text, p_match text) returns void language plpgsql as $$
declare ok boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%'||p_match||'%' then ok := true;
    else raise exception 'Erreur inattendue pour [%] : % (attendu : %)', p_sql, sqlerrm, p_match; end if;
  end;
  if not ok then raise exception 'AUCUNE erreur levée pour [%] (attendu : %)', p_sql, p_match; end if;
end $$;
grant execute on all functions in schema t to authenticated, anon;
