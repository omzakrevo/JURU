import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';
import '../../widgets/demo_banner.dart';
import 'otp_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _phone = TextEditingController();
  final _name = TextEditingController();
  bool _signup = false, _terms = false, _busy = false;
  String? _error;

  Future<void> _send() async {
    final phone = normalizePhoneBf(_phone.text);
    if (phone == null) return setState(() => _error = 'Numéro invalide. Exemple : 70 12 34 56');
    if (_signup && (!_terms || _name.text.trim().length < 3)) {
      return setState(() => _error = 'Indiquez votre nom et acceptez les conditions.');
    }
    setState(() { _busy = true; _error = null; });
    try {
      await db.auth.signInWithOtp(phone: phone, shouldCreateUser: _signup, data: _signup ? {'full_name': _name.text.trim(), 'country_code': 'BF'} : null);
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => OtpPage(phone: phone, signup: _signup)));
    } catch (_) {
      setState(() => _error = "Impossible d'envoyer le code. Vérifiez le numéro.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          const DemoBanner(),
          Expanded(
            child: ListView(padding: const EdgeInsets.all(24), children: [
              const SizedBox(height: 24),
              Text('JURU', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.w900)),
              const Text('Le financement, en toute confiance.'),
              const SizedBox(height: 32),
              SegmentedButton<bool>(
                segments: const [ButtonSegment(value: false, label: Text('Connexion')), ButtonSegment(value: true, label: Text('Inscription'))],
                selected: {_signup},
                onSelectionChanged: (s) => setState(() => _signup = s.first),
              ),
              const SizedBox(height: 20),
              if (_signup) ...[
                TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nom complet')),
                const SizedBox(height: 12),
              ],
              TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Téléphone', prefixText: '+226 ', hintText: '70 12 34 56')),
              if (_signup)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _terms,
                  onChanged: (v) => setState(() => _terms = v ?? false),
                  title: const Text("J'accepte les conditions d'utilisation et la politique de confidentialité.", style: TextStyle(fontSize: 13)),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
              const SizedBox(height: 16),
              FilledButton(onPressed: _busy ? null : _send, child: Text(_busy ? 'Envoi…' : 'Recevoir mon code')),
            ]),
          ),
        ]),
      ),
    );
  }
}
