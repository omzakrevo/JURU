# Documentation de l'API

L'API est celle de Supabase : tables en lecture via PostgREST (filtrées par **RLS**) et **fonctions RPC** pour toute écriture
sensible. Appel : `POST {SUPABASE_URL}/rest/v1/rpc/<fonction>` avec `apikey: <anon>` et `Authorization: Bearer <JWT utilisateur>`,
corps JSON des paramètres. Erreurs : message `CODE: texte` (ex. `KYC_REQUIRED: …`), HTTP 400 (règle métier) ou 403/42501 (droits).
Montants = FCFA entiers ; taux = points de base annuels (1800 = 18 %).

## Utilisateur
| RPC | Paramètres | Effet / règles |
|---|---|---|
| `quote_loan(p_country, p_principal, p_rate_bps, p_months)` | | Devis complet (échéancier, frais, TAEG, coût total). Valide les bornes pays. |
| `submit_kyc(p_document_type, p_document_last4, p_document_expiry, p_front_path, p_back_path, p_selfie_path, p_consent, p_consent_version)` | | Consentement obligatoire ; chemins sous `{uid}/…` ; un dossier `pending` max. |
| `submit_loan_request(p_amount, p_purpose, p_details, p_duration, p_max_rate_bps, p_income, p_expenses, p_existing_debt, p_guarantee_*)` | | KYC requis ; score de risque ; `open` (auto) ou `pending_review`. Max 3 actives. Bloquée si retard. |
| `cancel_loan_request(p_id)` | | |
| `publish_funding_offer(p_title, p_amount, p_min_amount, p_max_amount, p_min_duration, p_max_duration, p_rate_bps, p_purposes, p_requires_guarantee)` | | Prêteur KYC + origine des fonds. |
| `set_offer_status(p_id, p_status)` | active/paused/closed | |
| `find_matching_offers(p_request_id)` / `find_matching_requests(p_offer_id)` | | Matching noté 0–100. |
| `propose_application(p_request_id, p_offer_id, p_rate_bps, p_message)` | | Pas d'auto-financement ; taux ≤ max emprunteur. |
| `withdraw_application(p_id)` | | |
| `respond_application(p_id, p_accept, p_ack_total_cost)` | | Acceptation **exige** `p_ack_total_cost` = coût total affiché. Crée le contrat (conditions + hash figés). |
| `sign_contract(p_contract_id, p_consent, p_evidence)` | | Double signature → création du crédit. |
| `cancel_contract(p_contract_id)` | | Avant signature complète ; libère l'offre. |
| `get_payoff_amount(p_loan_id)` | | Solde de remboursement anticipé. |
| `record_repayment(p_loan_id, p_amount, p_idempotency_key, p_early_full)` | | **Simulé.** Idempotent. Imputation pénalités → intérêts → capital. |
| `mark_notifications_read(p_ids)` | | |
| `submit_contact_message(...)` | anon | Formulaire public. |

## Personnel (rôles vérifiés côté serveur)
| RPC | Rôles |
|---|---|
| `review_kyc(p_submission, p_decision, p_reason, p_notes)` | super_admin, compliance_officer (jamais sur soi-même) |
| `review_loan_request(p_id, p_approve, p_reason)` / `review_funding_offer(...)` | credit_agent (+ compliance pour offres), super_admin |
| `request_disbursement(p_loan_id)` | credit_agent, finance_manager, super_admin |
| `request_role_grant(p_user, p_role)` | super_admin |
| `decide_approval(p_approval_id, p_approve, p_note)` | finance_manager/super_admin (décaissement), super_admin (rôle) — **≠ demandeur** |
| `reverse_journal(p_journal, p_reason)` | finance_manager, super_admin |
| `refresh_overdue([p_today])`, `send_installment_reminders([p_today])` | service/cron, finance_manager, super_admin |
| `set_loan_status(p_loan_id, p_status, p_reason)` | credit_agent, compliance_officer, super_admin |
| `update_dispute(p_id, p_status, p_resolution)` | support, compliance_officer, super_admin |
| `admin_set_user_status(p_user, p_status, p_reason)` | support, compliance_officer, super_admin |
| `admin_dashboard_stats()` | tout le personnel |
| `apply_retention_policy()`, `log_kyc_document_access(p_submission)`, `set_contact_status(...)` | conformité / support |

## Lecture (RLS)
Tables lisibles selon le rôle ; vues contrôlées : `marketplace_requests` (prêteurs vérifiés, sans identité ni revenus),
`counterparty_cards` (prénom + initiale), `ledger_balances`. Aucune écriture directe n'est possible sur
loans, contrats, remboursements, paiements, ledger, audit (privilèges retirés + RLS).

## Edge Functions
- `POST /functions/v1/payment-webhook/sas-pay` — signature HMAC, stockage idempotent. En-têtes `X-Webhook-Signature` / `X-Webhook-Timestamp`, HMAC-SHA256 de `timestamp.corps`, tolérance 5 min, clé d'idempotence `event:id` ; stocke seulement (pas de comptabilité) ; 503 sans secret.
- `POST /functions/v1/send-sms-hook` — hook GoTrue « Send SMS » : envoie l'OTP via SMS Bus (signature Standard Webhooks). Envoi via SMS Bus (`SMSBUS_ID` requis).
- `POST /functions/v1/notify` — file SMS (SMS Bus) / push (FCM), protégée par `NOTIFY_CRON_TOKEN`. **Fournisseurs non connectés.**

## PaymentGateway (TypeScript)
`collect`, `disburse`, `getStatus`, `verifyWebhook` ; `SimulationGateway` (actif), `OrangeMoneyGateway` / `MoovMoneyGateway`
(`SasPayGateway` : implémenté d'après docs.saspay.me, inactif tant que les paiements réels sont désactivés). Voir `apps/web/src/lib/payments/`.
