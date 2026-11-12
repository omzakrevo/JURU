import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';

/// Marché : un prêteur vérifié voit les demandes (vue sans données sensibles) ; un emprunteur voit les offres actives.
class MarketPage extends StatefulWidget {
  const MarketPage({super.key});
  @override
  State<MarketPage> createState() => _MarketPageState();
}

class _MarketPageState extends State<MarketPage> {
  bool _requests = false;
  late Future<List<Map<String, dynamic>>> _f;
  @override
  void initState() { super.initState(); _f = _load(); }

  Future<List<Map<String, dynamic>>> _load() async {
    final rows = _requests
        ? await db.from('marketplace_requests').select().order('published_at', ascending: false).limit(50)
        : await db.from('funding_offers').select().eq('status', 'active').order('annual_rate_bps').limit(50);
    return (rows as List).cast<Map<String, dynamic>>();
  }

  Future<void> _propose(Map<String, dynamic> r) async {
    final rate = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('Proposer ${formatFcfa(r['amount'] as num)}'),
        content: TextField(controller: rate, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Taux annuel % (max ${formatBps(r['max_annual_rate_bps'] as int)})')),
        actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Envoyer'))],
      ),
    );
    if (ok != true) return;
    try {
      final bps = ((double.tryParse(rate.text.replaceAll(',', '.')) ?? -1) * 100).round();
      await db.rpc('propose_application', params: {'p_request_id': r['id'], 'p_offer_id': null, 'p_rate_bps': bps, 'p_message': null});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Proposition envoyée.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(rpcMessage(e))));
    }
  }

  @override
  Widget build(BuildContext context) => Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: SegmentedButton<bool>(
            segments: const [ButtonSegment(value: false, label: Text('Offres')), ButtonSegment(value: true, label: Text('Demandes'))],
            selected: {_requests},
            onSelectionChanged: (s) => setState(() { _requests = s.first; _f = _load(); }),
          ),
        ),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _f,
            builder: (c, s) {
              if (s.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
              if (s.hasError) return Center(child: Text(rpcMessage(s.error!)));
              final rows = s.data!;
              if (rows.isEmpty) return Center(child: Text(_requests ? 'Aucune demande (réservé aux prêteurs vérifiés).' : 'Aucune offre.'));
              return RefreshIndicator(
                onRefresh: () async => setState(() => _f = _load()),
                child: ListView(children: [
                  for (final r in rows)
                    Card(
                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: ListTile(
                        title: Text(_requests ? '${formatFcfa(r['amount'] as num)} · ${r['duration_months']} mois' : r['title'] as String),
                        subtitle: Text(_requests
                            ? '${r['borrower_display']} · risque ${r['risk_grade']} · taux max ${formatBps(r['max_annual_rate_bps'] as int)}'
                            : '${formatBps(r['annual_rate_bps'] as int)} · ${formatFcfa(r['min_amount'] as num)} – ${formatFcfa(r['max_amount'] as num)}'),
                        trailing: _requests ? TextButton(onPressed: () => _propose(r), child: const Text('Proposer')) : null,
                      ),
                    ),
                ]),
              );
            },
          ),
        ),
      ]);
}
