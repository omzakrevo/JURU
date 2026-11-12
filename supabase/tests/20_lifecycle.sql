-- Cycle de vie complet, grand livre, retards, remboursement anticipé (rôle postgres + JWT simulé)
\set AWA '00000000-0000-4000-8000-0000000000b1'
\set FAT '00000000-0000-4000-8000-0000000000b3'
do $$
declare l loans; v_due bigint; v_pen bigint; v_payoff bigint; r jsonb; d bigint; c bigint;
begin
  select * into l from loans where principal = 150000;
  -- état initial issu du seed
  assert l.status = 'active', 'crédit actif après décaissement';
  assert l.is_simulation, 'crédit en simulation';
  assert l.fee_total = 3000, 'commission 2% = 3000';
  assert (select count(*) from repayment_schedules where loan_id = l.id) = 6, '6 échéances';
  assert (select sum(principal_due) from repayment_schedules where loan_id = l.id) = 150000, 'somme principal';
  assert (select sum(interest_due) from repayment_schedules where loan_id = l.id) = l.interest_total, 'somme intérêts';
  assert (select count(*) from loan_contracts where status = 'signed' and terms_hash is not null) = 1, 'contrat signé + hash';
  assert l.amount_repaid = 20000, 'remboursement partiel du seed';
  assert (select count(*) from approval_requests where status = 'executed' and action_type = 'disbursement') = 1, 'double validation exécutée';

  -- grand livre équilibré, soldes attendus
  select sum(debit), sum(credit) into d, c from ledger_entries;
  assert d = c and d > 0, 'ledger équilibré';
  assert (select balance from ledger_balances where code = '1010') = 3000, 'fonds en transit = commission restante';
  assert (select balance from ledger_balances where code = '2100') = 0, 'aucune dette envers les prêteurs';
  assert (select balance from ledger_balances where code = '4010') = 3000, 'revenu commission';
  assert not exists (select 1 from ledger_journals where is_simulation = false), 'tous les journaux sont simulés';
  assert not exists (select 1 from payment_transactions where is_simulation = false), 'toutes les transactions simulées';

  -- le 1er remboursement a d'abord payé intérêts puis capital
  assert (select interest_paid from repayment_schedules where loan_id = l.id and installment_no = 1) > 0, 'intérêts imputés d''abord';
end $$;

-- Idempotence : même clé = même résultat, pas de double paiement
select t.act(:'AWA');
do $$
declare l loans; r jsonb; before_amt bigint; n_before int;
begin
  select * into l from loans where principal = 150000;
  before_amt := l.amount_repaid; select count(*) into n_before from payment_transactions where loan_id = l.id;
  r := record_repayment(l.id, 20000, 'seed-rep-1');
  assert (r->>'idempotent_replay')::boolean, 'rejeu idempotent';
  assert (select amount_repaid from loans where id = l.id) = before_amt, 'pas de double imputation';
  assert (select count(*) from payment_transactions where loan_id = l.id) = n_before, 'pas de double transaction';
  perform t.expect_error(format('select record_repayment(%L, 99999999, ''too-high'')', l.id), 'AMOUNT_TOO_HIGH');
  perform t.expect_error(format('select record_repayment(%L, 0, ''zero'')', l.id), 'AMOUNT_INVALID');
  perform t.expect_error(format('select record_repayment(%L, 1000, '' '')', l.id), 'IDEMPOTENCY_KEY_REQUIRED');
end $$;

-- Retard : pénalité unique, statut overdue, régularisation
select set_config('request.jwt.claims', '', false);
do $$
declare l loans; n int;
begin
  select * into l from loans where principal = 150000;
  n := refresh_overdue(current_date + 40);
  assert n = 1, 'une échéance passée en retard, obtenu ' || n;
  assert (select status from loans where id = l.id) = 'overdue', 'crédit en retard';
  assert (select penalty_due from repayment_schedules where loan_id = l.id and installment_no = 1) > 0, 'pénalité appliquée';
  n := refresh_overdue(current_date + 40);
  assert n = 0 or (select penalty_due from repayment_schedules where loan_id = l.id and installment_no = 1)
                = (select penalties_accrued from loans where id = l.id), 'pénalité non cumulée deux fois';
  assert (select count(*) from notifications where type = 'installment_overdue') >= 1, 'notification de retard';
  -- une nouvelle demande est bloquée tant que le retard existe
  perform t.act('00000000-0000-4000-8000-0000000000b1');
end $$;
select t.act(:'AWA');
select t.expect_error('select submit_loan_request(20000,''commerce'',''x'',3,1800,220000,90000,0)', 'OVERDUE_LOAN');
do $$
declare l loans; v_due bigint;
begin
  select * into l from loans where principal = 150000;
  select (principal_due-principal_paid)+(interest_due-interest_paid)+(penalty_due-penalty_paid) into v_due
    from repayment_schedules where loan_id = l.id and installment_no = 1;
  perform record_repayment(l.id, v_due, 'arrears-1');
  assert (select status from repayment_schedules where loan_id = l.id and installment_no = 1) = 'paid', 'échéance 1 soldée';
  assert (select status from loans where id = l.id) = 'active', 'crédit redevenu actif';
  assert (select penalties_paid from loans where id = l.id) = (select penalties_accrued from loans where id = l.id), 'pénalité payée';
  assert (select balance from ledger_balances where code = '4020') = (select penalties_paid from loans where id = l.id), 'revenu pénalités = pénalités payées';
end $$;

-- Remboursement anticipé : capital restant dû + intérêts échus, intérêts futurs non dus
do $$
declare l loans; v_payoff bigint; r jsonb; v_prin_left bigint;
begin
  select * into l from loans where principal = 150000;
  v_payoff := get_payoff_amount(l.id);
  select sum(principal_due - principal_paid) into v_prin_left from repayment_schedules where loan_id = l.id;
  assert v_payoff = v_prin_left, 'solde anticipé = capital restant (aucune échéance échue impayée)';
  perform t.expect_error(format('select record_repayment(%L, %s, ''early-bad'', true)', l.id, v_payoff + 1), 'PAYOFF_MISMATCH');
  r := record_repayment(l.id, v_payoff, 'early-1', true);
  assert (r->>'loan_closed')::boolean, 'crédit clôturé';
  assert (select status from loans where id = l.id) = 'repaid', 'statut repaid';
  assert (select closed_at from loans where id = l.id) is not null, 'closed_at renseigné';
  assert not exists (select 1 from repayment_schedules where loan_id = l.id and status <> 'paid'), 'toutes échéances soldées';
  assert (select sum(interest_waived) from repayment_schedules where loan_id = l.id) > 0, 'intérêts futurs annulés';
  assert (select sum(principal_paid) from repayment_schedules where loan_id = l.id) = 150000, 'capital intégralement remboursé';
  assert (select count(*) from notifications where type = 'loan_closed') >= 2, 'notifications de clôture';
  assert (select sum(debit) from ledger_entries) = (select sum(credit) from ledger_entries), 'ledger toujours équilibré';
  perform t.expect_error(format('select record_repayment(%L, 1000, ''after-close'')', l.id), 'INVALID_STATE');
end $$;

-- Calcul d'échéancier : propriétés sur de nombreuses combinaisons
select set_config('request.jwt.claims', '', false);
do $$
declare p bigint; m int; rt int; s record; n int := 0;
begin
  foreach p in array array[5000, 12345, 99999, 150000, 333333, 500000] loop
    foreach m in array array[1,2,3,6,7,12,24] loop
      foreach rt in array array[0,600,1800,2400] loop
        select sum(principal_due) sp, sum(interest_due) si, count(*) c, min(total_due) mn into s from calc_schedule(p, rt, m);
        assert s.sp = p, format('somme principal=%s pour %s/%s/%s', s.sp, p, m, rt);
        assert s.c = m, 'nombre d''échéances';
        assert s.mn > 0, 'échéance positive';
        if rt = 0 then assert s.si = 0, 'taux 0 => 0 intérêt'; end if;
        n := n + 1;
      end loop;
    end loop;
  end loop;
  -- TAEG cohérent : sans frais = taux nominal composé ; avec frais > nominal
  assert effective_annual_rate_bps(100000, array[100000]) = 0, 'TAEG nul sans coût';
  assert (quote_loan('BF', 150000, 1800, 6)->>'effective_annual_rate_bps')::int > 1800, 'TAEG > taux nominal (frais inclus)';
  assert (quote_loan('BF', 150000, 1800, 6)->>'total_cost')::bigint = (quote_loan('BF', 150000, 1800, 6)->>'interest_total')::bigint + 3000, 'coût total = intérêts + commission';
  perform t.expect_error('select quote_loan(''BF'', 4999, 1000, 3)', 'AMOUNT_OUT_OF_RANGE');
  perform t.expect_error('select quote_loan(''BF'', 500001, 1000, 3)', 'AMOUNT_OUT_OF_RANGE');
  perform t.expect_error('select quote_loan(''BF'', 50000, 1000, 25)', 'DURATION_OUT_OF_RANGE');
  perform t.expect_error('select quote_loan(''BF'', 50000, 99999, 3)', 'RATE_OUT_OF_RANGE');
  raise notice '% combinaisons d''échéancier vérifiées', n;
end $$;
