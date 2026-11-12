-- 0011 — SAS Pay comme agrégateur de paiement Mobile Money (Orange Money, Moov Money).
-- Le fournisseur « sas_pay » ne peut être utilisé qu'avec payments_live_enabled = true (garde-fou existant),
-- c'est-à-dire jamais tant que la validation juridique/contractuelle n'est pas faite.
alter type payment_provider add value if not exists 'sas_pay';
alter table payment_transactions add column if not exists channel text
  check (channel is null or channel in ('orange_money','moov_money'));
comment on column payment_transactions.channel is 'Canal Mobile Money acheminé par le fournisseur (ex. via SAS Pay)';
