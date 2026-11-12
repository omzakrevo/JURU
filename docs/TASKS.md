# Tâches — état d'avancement

## Terminé
- [x] Architecture, structure du dépôt, design system (tokens clair/sombre, Inter)
- [x] Migrations PostgreSQL (toutes les tables demandées + `ledger_journals`, `approval_requests`, `payment_webhook_events`, `device_tokens`, `contact_messages`), contraintes, index, RLS, triggers d'immuabilité/audit
- [x] RPC métier : devis/TAEG, KYC, demandes (score), offres, matching, propositions, contrats, signature, double validation, décaissement simulé, remboursements (partiel/anticipé/idempotent), retards, rappels, litiges, admin, rétention
- [x] Seeds de référence + démo fictive ; tests SQL (cycle de vie + sécurité) — **tous verts**
- [x] Site public (accueil+simulateur, fonctionnement, emprunter, prêter, sécurité, FAQ, tarifs, contact fonctionnel, CGU/confidentialité *projets*)
- [x] Auth téléphone + OTP, session SSR, middleware, limitation de requêtes
- [x] Espace utilisateur : profil, KYC (Storage privé), demandes, offres, marché+filtres, propositions, contrats (+PDF), crédits, remboursement simulé, litiges, notifications
- [x] Administration par rôles : dashboard, KYC (URL signées journalisées), demandes, offres, crédits, double validation, transactions, ledger, litiges, utilisateurs, partenaires, pays, audit, rapports CSV, messages
- [x] PaymentGateway + simulation + squelettes Orange/Moov (non connectés) ; Edge Functions webhook/notify (squelettes)
- [x] Application Flutter (code écrit ; **non compilé** ici)
- [x] Documentation (architecture, installation, déploiement, API, sécurité, tests)

## Restant / à valider
- [ ] **Exécuter sur votre VPS** : appliquer migrations, configurer GoTrue SMS, tester les parcours manuels (docs/TESTS.md) — non testé de bout en bout via PostgREST/GoTrue ici
- [ ] Compiler/tester l'app Flutter (`flutter analyze/test`), générer le projet Android, FCM
- [ ] Déployer et tester les Edge Functions (Deno non disponible ici)
- [ ] Validation juridique : nom JURU, CGU/confidentialité, plafond de taux (usure), signature électronique, règles AML/KYC, durées de conservation, conditions de remboursement anticipé
- [x] `SasPayGateway` (softpay, payouts, verify, webhook signé) et webhook Edge Function — testés avec requêtes simulées ; **jamais essayés contre l'API réelle**
- [ ] **SAS Pay — orchestration live** : file de collecte prêteur (redirection `checkout_url`, OTP Orange BF), retraits emprunteur (IP whitelistée), traitement des webhooks → revérification `verify` → mise à jour statuts + écritures comptables (frais SAS Pay `fee`/`fee_charge_mode` dans le ledger 5010), rapprochement ; essais `sk_test_` ; contrat et validation juridique avant toute activation
- [x] Client SMS Bus (`_shared/smsbus.ts`), hook OTP GoTrue et file `notify` — testés avec requêtes simulées ; **à essayer en réel** (format de réponse de SMS Bus à confirmer)
- [ ] OTP de re-signature ; filtrage sanctions/PEP ; liveness/OCR KYC
- [ ] Génération du PDF contrat côté serveur stockée dans Storage `contracts` (actuellement PDF à la volée) ; partenaires : portail dédié (rôle `partner`)
- [ ] Tests E2E navigateur (Playwright) sur instance Supabase de test ; revue de sécurité externe
- [ ] Prêts partiels (financement par plusieurs prêteurs), multi-pays UEMOA (devises/règles), i18n
