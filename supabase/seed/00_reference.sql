-- =============================================================================
-- JURU — Données de référence (sûres en production)
-- Les valeurs réglementaires (plafonds de taux, durées de conservation) sont des PLACEHOLDERS
-- à faire valider par un conseil juridique avant ouverture au public.
-- =============================================================================
insert into countries(code, name, currency, dial_code, timezone, is_launched) values
  ('BF','Burkina Faso','XOF','+226','Africa/Ouagadougou', true),
  ('CI','Côte d''Ivoire','XOF','+225','Africa/Abidjan', false),
  ('SN','Sénégal','XOF','+221','Africa/Dakar', false),
  ('ML','Mali','XOF','+223','Africa/Bamako', false),
  ('NE','Niger','XOF','+227','Africa/Niamey', false),
  ('TG','Togo','XOF','+228','Africa/Lome', false),
  ('BJ','Bénin','XOF','+229','Africa/Porto-Novo', false),
  ('GW','Guinée-Bissau','XOF','+245','Africa/Bissau', false)
on conflict (code) do nothing;

insert into country_settings(country_code, display_timezone, legal_notice)
select code, timezone, 'JURU est une plateforme de mise en relation. Ce n''est pas un établissement financier agréé. MODE DÉMONSTRATION : aucun fonds réel.'
from countries on conflict (country_code) do nothing;

-- Commission de mise en relation (visible, unique, incluse dans le coût total) : 2 % min 500 FCFA, max 10 000 FCFA
insert into platform_fees(country_code, fee_type, calc_method, value, min_amount, max_amount, description)
select code, 'origination', 'percent_bps', 200, 500, 10000,
       'Commission de mise en relation : 2 % du capital (min 500 / max 10 000 FCFA), payée une seule fois, prélevée au décaissement.'
from countries on conflict do nothing;

-- Plan de comptes système
insert into ledger_accounts(code, name, type, normal_side, description) values
  ('1010','Fonds en transit chez le partenaire','asset','debit','Fonds détenus par le partenaire autorisé — jamais sur un compte ordinaire JURU'),
  ('2100','Fonds des prêteurs détenus','liability','credit','Dettes de restitution/reversement envers les prêteurs'),
  ('4010','Commissions de mise en relation','revenue','credit','Commission d''origination'),
  ('4020','Pénalités de retard','revenue','credit','Pénalités contractuelles de retard'),
  ('5010','Frais fournisseurs de paiement','expense','debit','Frais Orange Money / Moov Money')
on conflict (code) do nothing;
