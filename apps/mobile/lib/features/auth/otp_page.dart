import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/supabase.dart';

class OtpPage extends StatefulWidget {
  const OtpPage({super.key, required this.phone, required this.signup});
  final String phone;
  final bool signup;
  @override
  State<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends State<OtpPage> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _verify() async {
    setState(() { _busy = true; _error = null; });
    try {
      final res = await db.auth.verifyOTP(phone: widget.phone, token: _code.text.trim(), type: OtpType.sms);
      if (widget.signup && res.user != null) {
        final now = DateTime.now().toUtc().toIso8601String();
        await db.from('profiles').update({'consent_terms_at': now, 'consent_privacy_at': now}).eq('id', res.user!.id);
      }
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (_) {
      setState(() => _error = 'Code incorrect ou expiré.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Vérification')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Un code a été envoyé au ${widget.phone}.'),
            const SizedBox(height: 16),
            TextField(controller: _code, keyboardType: TextInputType.number, maxLength: 8, textAlign: TextAlign.center, style: const TextStyle(fontSize: 28, letterSpacing: 8), decoration: const InputDecoration(counterText: '')),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            FilledButton(onPressed: _busy ? null : _verify, child: Text(_busy ? 'Vérification…' : 'Valider')),
          ]),
        ),
      );
}
