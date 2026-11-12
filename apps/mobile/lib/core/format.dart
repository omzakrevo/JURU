/// Montants en FCFA entiers ; taux en points de base.
String formatFcfa(num? v) {
  if (v == null) return '—';
  final s = v.round().abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
    buf.write(s[i]);
  }
  return '${v < 0 ? '-' : ''}$buf FCFA';
}

String formatBps(int? bps) {
  if (bps == null) return '—';
  final pct = bps / 100;
  return '${pct == pct.roundToDouble() ? pct.round().toString() : pct.toStringAsFixed(2).replaceAll('.', ',')} %';
}

/// Burkina Faso : +226 + 8 chiffres. Retourne null si invalide.
String? normalizePhoneBf(String input) {
  var d = input.replaceAll(RegExp(r'[^\d+]'), '');
  if (d.startsWith('+')) {
    d = d.substring(1);
  } else if (d.startsWith('00')) {
    d = d.substring(2);
  }
  if (d.startsWith('226') && d.length == 11) return '+$d';
  if (d.length == 8) return '+226$d';
  return null;
}

String formatDate(String? iso) {
  if (iso == null || iso.length < 10) return '—';
  final p = iso.substring(0, 10).split('-');
  return '${p[2]}/${p[1]}/${p[0]}';
}

/// Les RPC SQL lèvent « CODE: message » : on n'affiche que le message.
String rpcMessage(Object error) {
  final raw = error.toString();
  final m = RegExp(r'([A-Z][A-Z0-9_]{2,}):\s*([^\n}]*)').firstMatch(raw);
  if (m != null) return m.group(2)!.trim();
  if (raw.contains('42501') || raw.contains('permission denied')) return "Vous n'avez pas les droits nécessaires.";
  return 'Une erreur est survenue. Réessayez.';
}
