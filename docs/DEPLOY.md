# Guide de déploiement

> Rappel : **ne jamais activer de paiements réels** avant validation juridique/réglementaire/contractuelle/technique.
> `country_settings.payments_live_enabled` reste `false` ; l'interface n'offre volontairement aucun bouton pour le changer.

## Checklist production
1. **Secrets** : clés Supabase (`JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`) régénérées (pas les valeurs d'exemple de docker-compose), mots de passe Postgres forts, `.env` hors dépôt.
2. **Réseau** : Postgres (5432) **non exposé** publiquement (pare-feu : seulement l'IP d'administration) ; seul le reverse proxy HTTPS (443) est public.
3. **HTTPS** : certificats Let's Encrypt (Caddy/nginx). HSTS déjà envoyé par l'application web.
4. **Sauvegardes** : `pg_dump` quotidien chiffré + copie hors site ; sauvegarde du volume Storage ; **test de restauration** trimestriel.
5. **Migrations** : `scripts/apply-migrations.sh --seed-ref` (jamais `--seed-demo`). Créer le 1er super administrateur manuellement :
   créer l'utilisateur dans Auth (e-mail + mot de passe fort), puis en SQL :
   `insert into user_roles(user_id, role) values ('<uuid>', 'super_admin');` — créez-en **deux** (la double validation l'exige).
6. **Tâches planifiées** (pg_cron si disponible, sinon cron système) :
   ```sql
   select cron.schedule('juru-overdue', '15 1 * * *', $$select refresh_overdue()$$);
   select cron.schedule('juru-reminders', '0 8 * * *', $$select send_installment_reminders()$$);
   select cron.schedule('juru-retention', '30 3 * * 0', $$select apply_retention_policy()$$);
   ```
7. **Edge Functions** : déployer `payment-webhook`, `notify` et `send-sms-hook` (voir `supabase/functions/`), secrets via l'environnement du service functions.
8. **SMS Bus** (OTP et rappels) : compléter `_shared/smsbus.ts` d'après la doc, définir `SMSBUS_API_KEY`/`SMSBUS_SENDER_ID` (secrets serveur), déployer `send-sms-hook` (OTP, via le hook GoTrue) et `notify` (rappels).

## Application web (Node)
```bash
cd apps/web && npm ci && npm run build
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… NEXT_PUBLIC_SITE_URL=https://juru.example npm start
```
Exemple nginx (reverse proxy + limitation de requêtes, indispensable en complément du limiteur applicatif) :
```nginx
limit_req_zone $binary_remote_addr zone=juru:10m rate=10r/s;
server {
  listen 443 ssl http2; server_name juru.example;
  location / { limit_req zone=juru burst=30 nodelay; proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-For $remote_addr; proxy_set_header Host $host; }
}
```
Gestionnaire de processus : systemd ou PM2 (`pm2 start npm --name juru -- start`).

## Mobile
`flutter build apk --release --dart-define=SUPABASE_URL=… --dart-define=SUPABASE_ANON_KEY=…` ; signature avec votre keystore ; publication Play Store après validation juridique.

## Passage futur aux paiements réels (hors périmètre actuel)
Prérequis : agrément/partenariat réglementaire, contrat SAS Pay (Orange Money / Moov Money), documentation et identifiants officiels, validation juridique
(contrats, signature électronique, taux, KYC/AML), tests en bac à sable fournisseur, revue de sécurité externe, procédure DBA
documentée et double validée pour passer `payments_live_enabled` à `true`, implémentation de `SasPayGateway` (collect = dépôt, disburse = retrait, webhook signé, getStatus),
rapprochement quotidien automatisé.
