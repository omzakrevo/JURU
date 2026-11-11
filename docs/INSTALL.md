# Guide d'installation (développement)

Prérequis : Node 20+ (testé 22), PostgreSQL 16 (pour les tests SQL locaux), accès à votre Supabase auto-hébergé,
Flutter ≥ 3.27 (mobile, optionnel). **Aucune clé secrète dans le code ou le frontend.**

## 1. Base de données sur votre VPS Supabase
Récupérez la chaîne de connexion Postgres directe (utilisateur `postgres`, port 5432 ou celui exposé par votre
configuration). Depuis une machine de confiance (pas depuis le navigateur) :
```bash
export DATABASE_URL='postgresql://postgres:<MOT_DE_PASSE>@<IP_OU_DOMAINE_VPS>:5432/postgres'
scripts/apply-migrations.sh --seed-ref            # schéma + RLS + RPC + référentiels (sûr en production)
scripts/apply-migrations.sh --seed-demo           # + données FICTIVES (développement seulement)
```
Chaque migration est appliquée une seule fois (suivi dans `kredia_meta.migrations`).
Alternative : Supabase CLI (`supabase db push`) en copiant les fichiers de `supabase/migrations/`.

> Les migrations modifient **votre** base : essayez-les d'abord sur une copie/instance de développement,
> et faites une sauvegarde (`pg_dump`) avant la production.

## 2. Authentification téléphone (GoTrue)
Dans la configuration de votre stack Supabase (`.env` de docker-compose) :
```
GOTRUE_EXTERNAL_PHONE_ENABLED=true
GOTRUE_EXTERNAL_EMAIL_ENABLED=true          # connexion du personnel (e-mail + mot de passe)
GOTRUE_SMS_PROVIDER=<twilio|messagebird|vonage|textlocal>   # fournisseur SMS réel (à choisir/contractualiser)
# En développement, SANS fournisseur SMS : codes de test fixes (jamais en production)
GOTRUE_SMS_TEST_OTP=22600000011:123456,22600000013:123456
```
Redémarrez le service `auth`. Le seed démo crée aussi des comptes **e-mail** (mot de passe `Kredia#Demo2026`, développement uniquement) :
`admin@kredia.demo`, `admin2@…`, `conformite@…`, `credit@…`, `finance@…`, `support@…`, `audit@…`, `compta@…`.
Les comptes utilisateurs fictifs (Awa, Issouf, Fatimata, Boukary, Salimata) se connectent aussi par e-mail via l'onglet « Équipe » (même mot de passe).

## 3. Application web
```bash
cd apps/web
cp .env.example .env.local     # renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (clé anon PUBLIQUE)
npm install
npm run dev                    # http://localhost:3000
```
Sans variables Supabase, le site public fonctionne et les pages privées affichent un guide de configuration.

## 4. Tests
```bash
cd apps/web && npm test && npm run typecheck && npm run lint && npm run build
scripts/test-db.sh             # migrations + seed + tests SQL sur un PostgreSQL local jetable (jamais sur Supabase)
```

## 5. Mobile
Voir `apps/mobile/README.md`.
