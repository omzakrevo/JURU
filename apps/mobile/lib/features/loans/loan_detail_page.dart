import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';
import '../../widgets/demo_banner.dart';

class LoanDetailPage extends StatefulWidget {
  const LoanDetailPage({super.key, required this.loanId, required this.isBorrower});
  final String loanId;
  final bool isBorrower;
  @override
  State<LoanDetailPage> createState() => _LoanDetailPageState();
}

class _LoanDetailPageState extends State<LoanDetailPage> {
  late Future<List<Map<String, dynamic>>> _f;
  bool _busy = false;
  // Clé d'idempotence par intention de paiement : un double appui ne peut pas payer deux fois.
  String _key = DateTime.now().microsecondsSinceEpoch.toString();

  @override
  void initState() { super.initState(); _f = _load(); }
  Future<List<Map<String, dynamic>>> _load() async =>
      ((await db.from('repayment_schedules').select().eq('loan_id', widget.loanId).order('installment_no')) as List).cast<Map<String, dynamic>>();

  num _due(Map<String, dynamic> r) =>
      (r['principal_due'] as num) - (r['principal_paid'] as num) + (r['interest_due'] as num) - (r['interest_paid'] as num) - (r['interest_waived'] as num) + (r['penalty_due'] as num) - (r['penalty_paid'] as num);

  Future<void> _pay(num amount, {bool early = false}) async {
    setState(() => _busy = true);
    try {
      await db.rpc('record_repayment', params: {'p_loan_id': widget.loanId, 'p_amount': amount.round(), 'p_idempotency_key': 'mob-$_key-${early ? 'e' : 'r'}', 'p_early_full': early});
      _key = DateTime.now().microsecondsSinceEpoch.toString();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('[DÉMO] Remboursement enregistré (simulation).')));
      setState(() => _f = _load());
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(rpcMessage(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _early() async {
    final payoff = await db.rpc('get_payoff_amount', params: {'p_loan_id': widget.loanId}) as num;
    if (!mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Remboursement anticipé'),
        content: Text('Solde à payer : ${formatFcfa(payoff)}\n(capital restant + intérêts échus ; intérêts futurs non dus)\n\nMODE DÉMONSTRATION : simulation.'),
        actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Tout rembourser'))],
      ),
    );
    if (ok == true) await _pay(payoff, early: true);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Échéancier')),
        body: Column(children: [
          const DemoBanner(),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _f,
              builder: (c, s) {
                if (s.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
                if (s.hasError) return Center(child: Text(rpcMessage(s.error!)));
                final rows = s.data!;
                final next = rows.where((r) => r['status'] != 'paid').firstOrNull;
                return ListView(padding: const EdgeInsets.all(12), children: [
                  for (final r in rows)
                    Card(child: ListTile(
                      title: Text('Échéance ${r['installment_no']} · ${formatDate(r['due_date'] as String)}'),
                      subtitle: Text('Capital ${formatFcfa(r['principal_due'] as num)} · Intérêts ${formatFcfa((r['interest_due'] as num) - (r['interest_waived'] as num))}'),
                      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(r['status'] == 'paid' ? '—' : formatFcfa(_due(r)), style: const TextStyle(fontWeight: FontWeight.w700)),
                        StatusChip(r['status'] as String),
                      ]),
                    )),
                  if (widget.isBorrower && next != null) ...[
                    const SizedBox(height: 8),
                    FilledButton(onPressed: _busy ? null : () => _pay(_due(next)), child: Text('Payer l\'échéance ${formatFcfa(_due(next))} (démo)')),
                    const SizedBox(height: 8),
                    OutlinedButton(onPressed: _busy ? null : _early, child: const Text('Remboursement anticipé (démo)')),
                  ],
                ]);
              },
            ),
          ),
        ]),
      );
}
