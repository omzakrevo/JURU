import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';
import '../../widgets/demo_banner.dart';
import '../kyc/kyc_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late Future<Map<String, dynamic>> _f;
  @override
  void initState() { super.initState(); _f = _load(); }
  Future<Map<String, dynamic>> _load() async => await db.from('profiles').select().eq('id', db.auth.currentUser!.id).single();

  Future<void> _toggle(String field, bool v) async {
    try {
      await db.from('profiles').update({field: v}).eq('id', db.auth.currentUser!.id);
      setState(() => _f = _load());
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(rpcMessage(e))));
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
        future: _f,
        builder: (c, s) {
          if (!s.hasData) return const Center(child: CircularProgressIndicator());
          final p = s.data!;
          return ListView(padding: const EdgeInsets.all(16), children: [
            Text(p['full_name'] ?? 'Mon profil', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            Text(p['phone'] ?? ''),
            const SizedBox(height: 12),
            ListTile(title: const Text("Vérification d'identité"), trailing: StatusChip(p['kyc_status'] as String), onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KycPage())).then((_) => setState(() => _f = _load()))),
            SwitchListTile(title: const Text('Je peux emprunter'), value: p['is_borrower'] as bool, onChanged: (v) => _toggle('is_borrower', v)),
            SwitchListTile(title: const Text('Je peux prêter'), subtitle: const Text("Complétez l'origine des fonds sur le site web."), value: p['is_lender'] as bool, onChanged: (v) => _toggle('is_lender', v)),
            const SizedBox(height: 16),
            const Text("JURU est une plateforme de mise en relation, pas un établissement financier agréé. Les fonds ne sont jamais conservés sur un compte ordinaire.", style: TextStyle(fontSize: 12)),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: () => db.auth.signOut(), child: const Text('Déconnexion')),
          ]);
        },
      );
}
