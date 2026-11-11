import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';

/// KYC : envoi des images dans le bucket PRIVÉ « kyc-documents » (dossier = id utilisateur, imposé par RLS),
/// puis appel de la RPC submit_kyc avec consentement explicite.
class KycPage extends StatefulWidget {
  const KycPage({super.key});
  @override
  State<KycPage> createState() => _KycPageState();
}

class _KycPageState extends State<KycPage> {
  final _picker = ImagePicker();
  final _folder = DateTime.now().microsecondsSinceEpoch.toString();
  final _last4 = TextEditingController();
  String _type = 'cnib';
  bool _consent = false, _busy = false;
  final Map<String, String> _paths = {};

  Future<void> _pick(String kind, ImageSource src) async {
    final f = await _picker.pickImage(source: src, maxWidth: 1800, imageQuality: 85);
    if (f == null) return;
    final Uint8List bytes = await f.readAsBytes();
    if (bytes.length > 5 * 1024 * 1024) return _toast('Fichier trop volumineux (5 Mo max).');
    final uid = db.auth.currentUser!.id;
    final path = '$uid/$_folder/$kind.jpg';
    try {
      await db.storage.from('kyc-documents').uploadBinary(path, bytes, fileOptions: const FileOptions(contentType: 'image/jpeg'));
      setState(() => _paths[kind] = path);
    } catch (e) {
      _toast("Envoi impossible. Réessayez.");
    }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await db.rpc('submit_kyc', params: {
        'p_document_type': _type, 'p_document_last4': _last4.text, 'p_document_expiry': null,
        'p_front_path': _paths['front'], 'p_back_path': _paths['back'], 'p_selfie_path': _paths['selfie'],
        'p_consent': _consent, 'p_consent_version': 'v1-demo',
      });
      _toast('Documents reçus. Vérification en cours.');
      if (mounted) Navigator.pop(context);
    } catch (e) {
      _toast(rpcMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Widget _slot(String kind, String label, ImageSource src) => ListTile(
        leading: Icon(_paths.containsKey(kind) ? Icons.check_circle : Icons.upload_file, color: _paths.containsKey(kind) ? Colors.green : null),
        title: Text(label),
        trailing: TextButton(onPressed: () => _pick(kind, src), child: Text(_paths.containsKey(kind) ? 'Remplacer' : 'Choisir')),
      );

  @override
  Widget build(BuildContext context) {
    final ready = _paths.containsKey('front') && _paths.containsKey('selfie') && _consent && !_busy;
    return Scaffold(
      appBar: AppBar(title: const Text("Vérification d'identité")),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        DropdownButtonFormField<String>(
          value: _type,
          items: const [DropdownMenuItem(value: 'cnib', child: Text('CNIB')), DropdownMenuItem(value: 'passport', child: Text('Passeport')), DropdownMenuItem(value: 'driving_license', child: Text('Permis')), DropdownMenuItem(value: 'residence_card', child: Text('Carte de séjour'))],
          onChanged: (v) => setState(() => _type = v ?? 'cnib'),
          decoration: const InputDecoration(labelText: 'Type de pièce'),
        ),
        const SizedBox(height: 12),
        TextField(controller: _last4, maxLength: 4, decoration: const InputDecoration(labelText: '4 derniers caractères du numéro')),
        _slot('front', 'Pièce — recto (obligatoire)', ImageSource.camera),
        _slot('back', 'Pièce — verso', ImageSource.camera),
        _slot('selfie', 'Selfie avec la pièce (obligatoire)', ImageSource.camera),
        CheckboxListTile(
          value: _consent,
          onChanged: (v) => setState(() => _consent = v ?? false),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          title: const Text("Je consens explicitement au traitement de mes documents d'identité pour vérifier mon identité.", style: TextStyle(fontSize: 13)),
        ),
        FilledButton(onPressed: ready ? _submit : null, child: Text(_busy ? 'Envoi…' : 'Envoyer pour vérification')),
      ]),
    );
  }
}
