import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';
import '../../widgets/demo_banner.dart';
import 'loan_detail_page.dart';

class LoansPage extends StatelessWidget {
  const LoansPage({super.key});
  @override
  Widget build(BuildContext context) => FutureBuilder(
        future: db.from('loans').select().order('created_at', ascending: false),
        builder: (c, s) {
          if (s.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
          if (s.hasError) return Center(child: Text(rpcMessage(s.error!)));
          final rows = (s.data as List).cast<Map<String, dynamic>>();
          if (rows.isEmpty) return const Center(child: Text('Aucun crédit. Il est créé après signature du contrat.'));
          return ListView(padding: const EdgeInsets.all(12), children: [
            for (final l in rows)
              Card(
                child: ListTile(
                  title: Text('Crédit n°${l['loan_no']} · ${formatFcfa(l['principal'] as num)}'),
                  subtitle: Text('Remboursé : ${formatFcfa(l['amount_repaid'] as num)} / ${formatFcfa(l['total_repayable'] as num)}'),
                  trailing: StatusChip(l['status'] as String),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoanDetailPage(loanId: l['id'] as String, isBorrower: l['borrower_id'] == db.auth.currentUser!.id))),
                ),
              ),
          ]);
        },
      );
}
