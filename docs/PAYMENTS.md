# Circuit de paiement — mode test SAS Pay

> **Aucun argent réel.** Trois modes par pays, pilotés par `country_settings` (jamais par l'interface) :
> | Mode | Réglage | Comportement |
> |---|---|---|
> | `simulation` (défaut) | aucun drapeau | Tout est immédiat et local, rien n'est envoyé |
> | `sandbox` | `payments_sandbox_enabled = true` | Appels réels à l'API SAS Pay **avec une clé `sk_test_`** ; l'état n'avance qu'après confirmation vérifiée |
> | `live` | `payments_live_enabled = true` | **Refusé** (`LIVE_PAYMENTS_NOT_IMPLEMENTED`), exclusif avec `sandbox` |
>
> Le code refuse toute clé `sk_live_` en mode test (`getSandboxGateway` → `allowLive:false`), et un trigger SQL interdit
> toute transaction `live` tant que `payments_live_enabled` est faux.

## Flux
```
DÉCAISSEMENT
 finance : request_disbursement → autre responsable : decide_approval (double validation)
   → disbursement = awaiting_funding        (prêteur notifié ; aucune écriture comptable)
 prêteur : page /app/financement/<id> → begin_collection (txn « initiated ») → API softpay (clé d'idempotence = txn)
   → txn « pending » (+ checkout_url : Orange Money redirige vers la page hébergée ; OTP pré-paiement Orange BF)
 confirmation (webhook stocké OU sondage, TOUJOURS revérifiée via GET /payments/{id}/verify/) → apply_payment_event
   succeeded → écriture « collecte » + txn payout « initiated » (net = capital − commission) ; disbursement = paying_out
   failed    → disbursement = failed (crédit inchangé ; décaissement redemandable)
 worker : claim_gateway_calls → POST /payouts/initialize/ (même clé à chaque rejeu) → pending → confirmation
   succeeded → écriture « décaissement », échéancier, crédit ACTIF
   failed    → disbursement = payout_failed : fonds collectés, DÉCISION MANUELLE (restitution/nouvel essai), audit + notification

REMBOURSEMENT
 emprunteur : start_repayment_intent (validations) → begin_collection → softpay → confirmation vérifiée
   succeeded → _apply_repayment (pénalités → intérêts → capital ; trop-perçu isolé au compte 2300) + payout « initiated » vers le prêteur
   failed    → rien n'est imputé
 worker : payout prêteur → confirmation → écriture « reversement » ; si échec : rapprochement = mismatch + audit
```
Garanties : la comptabilité ne bouge qu'après confirmation ; un statut terminal ne régresse jamais (conflit → audit) ;
un rejeu d'événement est sans effet ; les appels d'argent portent `Idempotency-Key` ; une coupure réseau ⇒ on rejoue avec la
MÊME clé (jamais une nouvelle) ; les collectes jamais soumises expirent après 30 min.

## Activer le mode test (sur votre VPS)
1. Créer un compte SAS Pay et une clé **`sk_test_…`** (tableau de bord → Développeur). Ne jamais utiliser `sk_live_…`.
2. Variables serveur de l'application web : `SASPAY_API_KEY=sk_test_…`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENTS_WORKER_TOKEN` (≥ 24 car. aléatoires),
   `SASPAY_FALLBACK_EMAIL`, `NEXT_PUBLIC_PAYMENT_MODE=sandbox`. Variable des Edge Functions : `WEBHOOK_SECRET_SAS_PAY`.
3. SAS Pay → **whitelist IP** : l'IP sortante fixe de ce serveur (obligatoire pour les retraits, sinon `403 ip_not_whitelisted`).
4. SAS Pay → créer le webhook : `https://<api>/functions/v1/payment-webhook/sas-pay`, abonnements `transaction.*` ; copier le `signing_secret` (affiché une fois).
5. Activer le mode (intervention DBA tracée) : `update country_settings set payments_sandbox_enabled = true where country_code = 'BF';`
6. Cron (chaque minute) : `curl -fsS -X POST -H "Authorization: Bearer $PAYMENTS_WORKER_TOKEN" https://<site>/api/payments/worker`.
   Le personnel financier peut aussi lancer le worker depuis **Admin → Transactions**.
7. Chaque utilisateur choisit Orange Money / Moov Money (profil ou à la première collecte) ; l'e-mail est exigé par SAS Pay (profil ou `SASPAY_FALLBACK_EMAIL`).
8. Retour arrière : `update country_settings set payments_sandbox_enabled = false …` (les opérations en cours restent consultables).

## À valider avec le sandbox SAS Pay (inconnues de la doc lue)
Comportement réel des statuts après redirection Orange, délais, format exact des webhooks de retrait, trop-perçus, annulations,
`wallet_frozen`/solde insuffisant sur les payouts, frais (`fee`, `fee_charge_mode`) à reporter au grand livre (compte 5010 : **pas encore alimenté**).
