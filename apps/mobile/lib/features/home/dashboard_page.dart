import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';
import '../../widgets/demo_banner.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  Future<Map<String, dynamic>> _load() async {
    final uid = db.auth.currentUser!.id;
    final profile = await db.from('profiles').select('full_name,kyc_status').eq('id', uid).single();
    final loans = await db.from('loans').select('id,loan_no,principal,status,borrower_id').inFilter('status', ['active', 'overdue', 'awaiting_disbursement']);
    final next = await db.from('repayment_schedules').select('due_date,principal_due,interest_due,installment_no,loan_id').neq('status', 'paid').order('due_date').limit(1);
    return {'profile': profile, 'loans': loans, 'next': next};
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
        future: _load(),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(rpcMessage(snap.error!))));
          final d = snap.data!;
          final p = d['profile'] as Map<String, dynamic>;
          final loans = (d['loans'] as List).cast<Map<String, dynamic>>();
          final next = (d['next'] as List).cast<Map<String, dynamic>>();
          return ListView(padding: const EdgeInsets.all(16), children: [
            Text('Bonjour ${(p['full_name'] ?? '').toString().split(' ').first} 👋', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            if (p['kyc_status'] != 'approved')
              Card(color: Colors.blue.withValues(alpha: .08), child: ListTile(leading: const Icon(Icons.badge_outlined), title: const Text("Vérifiez votre identité"), subtitle: Text('Statut KYC : ${p['kyc_status']}. Rendez-vous dans Profil › Identité.'))),
            const SizedBox(height: 8),
            Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Prochaine échéance'),
              const SizedBox(height: 4),
              next.isEmpty
                  ? const Text('Aucune échéance', style: TextStyle(fontWeight: FontWeight.w700))
                  : Text('${formatFcfa((next[0]['principal_due'] as num) + (next[0]['interest_due'] as num))} le ${formatDate(next[0]['due_date'] as String)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            ]))),
            const SizedBox(height: 8),
            Text('Mes crédits en cours', style: Theme.of(context).textTheme.titleMedium),
            if (loans.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('Aucun crédit pour le moment.')),
            for (final l in loans)
              Card(child: ListTile(title: Text('Crédit n°${l['loan_no']} · ${formatFcfa(l['principal'] as num)}'), trailing: StatusChip(l['status'] as String))),
          ]);
        },
      );
}
