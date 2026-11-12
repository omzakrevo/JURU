/// Configuration injectée à la compilation — JAMAIS de clé secrète dans l'application.
/// flutter run --dart-define=SUPABASE_URL=https://api.votre-domaine.com --dart-define=SUPABASE_ANON_KEY=<clé anon publique>
class Config {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const demoMode = bool.fromEnvironment('DEMO_MODE', defaultValue: true);
  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
