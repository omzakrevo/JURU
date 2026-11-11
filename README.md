# KREDIA — *Le financement, en toute confiance.*

Plateforme de **mise en relation** emprunteurs ↔ prêteurs (Burkina Faso, puis UEMOA), avec partenaires financiers réglementés.

> ⚠️ **KREDIA n'est pas un établissement financier agréé** et ne détient pas les fonds sur un compte ordinaire.
> **MODE DÉMONSTRATION** : aucun paiement, prêt ou décaissement réel n'est activé ; tout flux d'argent est simulé et signalé.
> Orange Money / Moov Money ne sont **pas connectés** (aucune API inventée). Le nom « KREDIA » est provisoire (à vérifier juridiquement).

## Contenu
| Dossier | Rôle |
|---|---|
| `supabase/` | Migrations SQL (schéma, RLS, RPC métier), seeds, tests SQL, Edge Functions |
| `apps/web/` | Next.js 15 + TypeScript + Tailwind : site public, espace utilisateur, administration |
| `apps/mobile/` | Flutter Android |
| `docs/` | `ARCHITECTURE`, `INSTALL`, `DEPLOY`, `API`, `SECURITY`, `TESTS`, `TASKS` |
| `scripts/` | `apply-migrations.sh` (votre VPS), `test-db.sh` (PostgreSQL local jetable) |

## Démarrage rapide
1. Appliquer les migrations sur votre Supabase : `docs/INSTALL.md` §1.
2. `cd apps/web && cp .env.example .env.local && npm install && npm run dev`.
3. Tests : `scripts/test-db.sh` et `cd apps/web && npm test`.

## Principes
La base de données applique les règles (RLS, RPC, triggers) : montants/états/rôles validés côté serveur, grand livre en partie double immuable,
double validation des opérations sensibles, audit append-only, contrats non modifiables après signature, coût total affiché avant acceptation.

Voir `docs/TASKS.md` pour l'état d'avancement et ce qui reste à valider.
