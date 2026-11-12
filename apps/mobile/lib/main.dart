import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config.dart';
import 'core/supabase.dart';
import 'core/theme.dart';
import 'features/auth/login_page.dart';
import 'features/home/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (Config.isConfigured) {
    await Supabase.initialize(url: Config.supabaseUrl, anonKey: Config.supabaseAnonKey);
  }
  runApp(const JuruApp());
}

class JuruApp extends StatelessWidget {
  const JuruApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JURU',
      debugShowCheckedModeBanner: false,
      theme: K.light(),
      darkTheme: K.dark(),
      themeMode: ThemeMode.system,
      home: Config.isConfigured ? const _AuthGate() : const _NotConfigured(),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: db.auth.onAuthStateChange,
      builder: (context, _) => db.auth.currentSession == null ? const LoginPage() : const HomeShell(),
    );
  }
}

class _NotConfigured extends StatelessWidget {
  const _NotConfigured();
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Padding(
          padding: EdgeInsets.all(24),
          child: Center(
            child: Text(
              'Supabase non configuré.\nLancez avec --dart-define=SUPABASE_URL=… --dart-define=SUPABASE_ANON_KEY=… (voir README).',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}
