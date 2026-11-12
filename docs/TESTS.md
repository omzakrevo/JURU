# Scénarios de test

## Automatisés
| Commande | Couverture |
|---|---|
| `scripts/test-db.sh` | 9 migrations, seeds, `20_lifecycle.sql` (cycle complet, ledger, idempotence, retard/pénalité, régularisation, remboursement anticipé, 504 combinaisons d'échéancier, TAEG, bornes), `30_security.sql` (règles métier, immuabilité contrat/ledger/audit, déséquilibre ledger, garde-fou paiements réels, double validation, RLS par rôle, vues, Storage) |
| `scripts/test-db.sh` — `40_payment_sandbox.sql` | Circuit sandbox : décaissement (échec puis reprise, versement, rejeu), remboursement (échec, succès, reversement, expiration, trop-perçu, versement échoué), droits `service_role`, garde-fous |
| `cd apps/web && npm test` | Worker/collecte (rejeux, échecs, reprises, revérification des webhooks), parité TS↔SQL de l'échéancier (valeurs de référence PostgreSQL), TAEG, frais, validations, téléphone UEMOA, erreurs RPC, PaymentGateway (idempotence, HMAC, non connecté), limiteur |
| `cd apps/web && npm run typecheck && npm run lint && npm run build` | Types, lint, build de toutes les routes |
| `cd apps/mobile && flutter test` | Formats (à lancer sur une machine avec Flutter) |

## Manuels (nécessitent votre Supabase + OTP de test)
1. **Inscription** : `/inscription` → code `123456` (GOTRUE_SMS_TEST_OTP) → profil complété.
2. **KYC** : déposer 3 images → statut « en attente » → compte conformité : valider → notification.
3. **Offre/Demande** : prêteur publie ; emprunteur crée une demande de 80 000 (auto-publiée) puis de 150 000 (examen humain → agent crédit approuve).
4. **Proposition → acceptation** : tenter d'accepter sans cocher le coût total (refus) ; accepter ; signer des deux côtés ; PDF.
5. **Double validation** : finance demande le décaissement ; tenter de l'approuver soi-même (refus) ; super admin approuve ; échéancier créé, bannière « démo » visible.
6. **Remboursement** : partiel, double clic (idempotent), anticipé ; crédit « remboursé ».
7. **Retard** : `select refresh_overdue(current_date + 40);` → pénalité, notification.
8. **RLS** : un utilisateur ne voit pas les dossiers d'un autre (URL directe → 404).
