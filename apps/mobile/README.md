# KREDIA — application Android (Flutter)

> **Non compilée dans l'environnement de génération** (SDK Flutter absent). Le code est écrit pour
> `supabase_flutter ^2.8` / Flutter ≥ 3.24 : exécutez `flutter analyze` et `flutter test` avant toute chose.

## Initialiser les fichiers de plateforme
Ce dépôt ne contient que `lib/`, `test/` et `pubspec.yaml`. Générez le projet Android :
```bash
cd apps/mobile
flutter create --platforms=android --org com.kredia --project-name kredia .
flutter pub get
```
Dans `android/app/src/main/AndroidManifest.xml` ajoutez les permissions `INTERNET` et `CAMERA`.

## Lancer
```bash
flutter run \
  --dart-define=SUPABASE_URL=https://api.votre-domaine.com \
  --dart-define=SUPABASE_ANON_KEY=<clé anon PUBLIQUE> \
  --dart-define=DEMO_MODE=true
```
Ne mettez **jamais** la clé `service_role` dans l'application.

## Fonctionnalités
Inscription/connexion téléphone + OTP · tableau de bord · marché (offres / demandes selon rôle) · crédits, échéancier,
remboursement partiel/anticipé **simulé** · KYC (envoi dans le Storage privé + consentement) · notifications · profil.
Toutes les règles métier sont appliquées côté serveur (RPC SQL) : l'application n'est qu'une vue.

## Notifications push (FCM) — non activées
1. Créez un projet Firebase, ajoutez `google-services.json` dans `android/app/`.
2. Décommentez `firebase_core` / `firebase_messaging` dans `pubspec.yaml`.
3. Au démarrage, enregistrez le jeton dans `device_tokens` (`user_id`, `token`, `platform='android'`).
4. Branchez l'envoi dans l'Edge Function `notify` (compte de service FCM, variables serveur).
