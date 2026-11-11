# Sécurité — mesures en place et limites

## En place (vérifié par tests SQL : `supabase/tests/30_security.sql`)
- **RLS** sur les 30 tables ; écritures directes retirées pour `anon`/`authenticated` hors quelques tables (profil, appareils, litiges) ; le reste passe par RPC `SECURITY DEFINER` qui revalident rôles, états et montants.
- **Rôles** : `user_roles` ; contrôles `has_any_role` côté serveur ; aucun rôle déduit du client.
- **Double validation** : contrainte `approved_by <> requested_by` + vérification de rôle ; décaissements et attribution de rôles.
- **Grand livre immuable** (triggers UPDATE/DELETE/TRUNCATE) et **équilibré** (trigger différé) ; extourne seule.
- **Audit append-only** ; triggers sur tables sensibles ; chemins KYC masqués ; accès aux documents KYC journalisé.
- **Contrats** : conditions immuables dès la création, contrat signé verrouillé, hash SHA-256.
- **Paiements** : clés d'idempotence uniques, `payment_webhook_events (provider,event_id)` unique, garde-fou SQL interdisant toute transaction non simulée tant que `payments_live_enabled=false`.
- **Storage** : buckets privés, dossier = id utilisateur, MIME/taille limités, lecture KYC réservée à la conformité.
- **Web** : en-têtes (CSP, HSTS, X-Frame-Options…), limitation de requêtes (OTP, connexion, contact, KYC), réponses d'erreur génériques (pas d'énumération), honeypot contact, export CSV protégé contre l'injection de formules, `getUser()` côté serveur, aucune clé secrète côté client.
- **Pas de numéro de pièce complet** stocké (4 derniers caractères uniquement).

## Limites / à faire avant production
- **Limiteur applicatif en mémoire** : par instance ; ajouter limitation nginx/Redis (voir DEPLOY).
- **Chiffrement au repos** : repose sur le disque/volumes du VPS (LUKS) ; chiffrement applicatif de champs non implémenté.
- **OTP de re-signature** : la signature enregistre `otp_verified:false` ; une revérification OTP au moment de signer reste à implémenter.
- **Scan antivirus / contrôles d'image KYC** (liveness, OCR) non implémentés ; le score auto est basique.
- **Sanctions/PEP (AML)** : aucun filtrage automatique ; revue humaine uniquement.
- **Webhooks fournisseurs** : format et signature à adapter à la documentation officielle (non disponible).
- **Test d'intrusion / revue externe** à réaliser avant tout paiement réel.
