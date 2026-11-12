# JURU — Architecture

> **Avertissement réglementaire.** JURU est une plateforme de *mise en relation*.
> Ce n'est **pas** un établissement financier agréé. La plateforme ne détient jamais les fonds
> des utilisateurs sur un compte ordinaire : les flux transitent par des partenaires autorisés
> (banques, SFD, opérateurs Mobile Money). Aucun paiement réel, prêt réel ou décaissement
> n'est activé avant validation juridique, réglementaire, contractuelle et technique.
> Tant que `country_settings.payments_live_enabled = false`, **tout est simulé** et signalé
> « MODE DÉMONSTRATION ». Le nom « JURU » est provisoire (vérification juridique à faire).

## 1. Vue d'ensemble

```
┌────────────────────┐   ┌────────────────────┐
│ apps/web (Next.js) │   │ apps/mobile (Flutter)│
│ site + app + admin │   │ Android             │
└─────────┬──────────┘   └──────────┬─────────┘
          │  supabase-js / supabase_flutter (JWT utilisateur, jamais de clé secrète)
          ▼
┌───────────────────────────────────────────────────────────┐
│ Supabase auto-hébergé (VPS)                               │
│  Auth (téléphone + OTP)   Storage privé (KYC, contrats)   │
│  PostgreSQL : tables + RLS + fonctions RPC SECURITY DEFINER│
│  Edge Functions : payment-webhook, notify, contract-pdf   │
└──────────────┬────────────────────────────┬───────────────┘
               │ PaymentGateway             │ SMS / FCM
               ▼                            ▼
   Orange Money / Moov Money (à contractualiser)   Fournisseur SMS, Firebase
```

### Principe directeur
**La base de données est la source de vérité des règles métier.** Les transitions d'état,
la validation des montants, le grand livre et les contrôles de rôle sont appliqués en SQL
(RLS + fonctions `SECURITY DEFINER`). Les clients (web, mobile) sont des vues : ils ne
peuvent pas contourner les règles, même s'ils sont modifiés.

## 2. Structure du dépôt

| Chemin | Contenu |
|---|---|
| `supabase/migrations/` | Schéma, contraintes, index, RLS, RPC métier (ordonnés) |
| `supabase/seed/` | `00_reference.sql` (sûr prod), `10_demo.sql` (fictif, dev seulement) |
| `supabase/tests/` | Tests SQL (cycle de vie, RLS, ledger) |
| `supabase/functions/` | Edge Functions (Deno) : webhooks signés, notifications |
| `apps/web/` | Next.js 15 + TypeScript + Tailwind (site public, app, admin) |
| `apps/mobile/` | Flutter (Android) |
| `docs/` | Architecture, API, installation, déploiement, sécurité, tests, tâches |

## 3. Modèle de données (résumé)

- **Identité** : `profiles` (1–1 avec `auth.users`), `user_roles` (RBAC), `borrower_profiles`, `lender_profiles`.
- **KYC** : `kyc_submissions` (documents en Storage privé), `kyc_reviews` (décisions humaines).
- **Marché** : `loan_requests`, `funding_offers`, `loan_applications` (propositions), `guarantees`.
- **Contrat** : `loan_contracts` (conditions figées + hash + signatures, immuable après signature).
- **Crédit** : `loans`, `repayment_schedules`, `repayments`.
- **Argent** : `payment_transactions` (idempotent), `payment_webhook_events`, `disbursements`.
- **Comptabilité** : `ledger_accounts`, `ledger_journals`, `ledger_entries` (partie double, immuable), `platform_fees`.
- **Support/Conformité** : `notifications`, `disputes`, `audit_logs`, `approval_requests` (double validation), `partner_accounts`, `countries`, `country_settings`.

Règles transverses : montants en **FCFA entiers** (`bigint`), dates en **UTC** (`timestamptz`),
fuseau d'affichage par pays (`country_settings.display_timezone`).

## 4. Machine d'états

```
loan_request : draft → pending_review → open → in_negotiation → accepted
                                  ↘ rejected        ↘ cancelled/expired
application  : proposed → accepted | rejected | withdrawn | expired
contract     : pending_signature → partially_signed → signed | cancelled
loan         : awaiting_disbursement → active ⇄ overdue → repaid | defaulted
disbursement : pending_approval → succeeded | rejected | failed
```

## 5. Validation hybride
1. **Automatique** (`submit_loan_request`, `publish_funding_offer`) : bornes pays, KYC, capacité
   de remboursement, score de risque. Faible risque + petit montant → publication directe.
2. **Humaine** : sinon `pending_review` → agent crédit / conformité décide (`review_*`).

## 6. Double validation
`approval_requests` : le demandeur ≠ l'approbateur (contrainte CHECK). Utilisé pour les
décaissements et l'attribution de rôles privilégiés. L'exécution se fait dans la fonction
`decide_approval`, jamais côté client.

## 7. Paiements (PaymentGateway)
Interface TypeScript/Deno `PaymentGateway` (`collect`, `disburse`, `getStatus`, `verifyWebhook`)
avec deux implémentations : `SimulationGateway` (actif) et `SasPayGateway` (**implémenté d'après docs.saspay.me, inactif** : jamais instancié tant que les paiements réels sont désactivés ; clé `sk_live_` refusée sans activation explicite).
SAS Pay est l'agrégateur retenu pour Orange Money et Moov Money (dépôt = `collect`, retrait = `disburse`) ; SMS Bus envoie les SMS (OTP via hook GoTrue, rappels via `notify`).
Les webhooks arrivent sur l'Edge Function `payment-webhook` : vérification de signature (HMAC,
secret en variable d'environnement serveur), insertion idempotente dans
`payment_webhook_events (provider, event_id)` unique, puis traitement. La vérification
serveur du statut est refaite auprès du fournisseur avant toute écriture comptable.

Garde-fou SQL : un enregistrement `is_simulation = false` est refusé tant que
`payments_live_enabled = false` pour le pays.

## 8. Ledger
Comptabilité en partie double, écritures **immuables** (triggers UPDATE/DELETE → exception),
équilibre vérifié par trigger différé, corrections par **écritures d'extourne**. Plan de comptes
système : 1010 Fonds chez partenaire, 2100 Fonds des prêteurs détenus, 4010 Commissions, 4020 Pénalités, 5010 Frais fournisseurs.

## 9. Sécurité (voir `docs/SECURITY.md`)
RLS partout, écriture sensible uniquement par RPC, journal d'audit append-only, Storage KYC
privé avec chemin `{user_id}/…`, aucune clé secrète côté client, limitation de requêtes (Edge/proxy),
signatures webhook, idempotence.
