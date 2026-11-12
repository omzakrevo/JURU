import 'package:flutter/material.dart';
import '../core/config.dart';
import '../core/theme.dart';

/// Bannière obligatoire tant que les paiements réels ne sont pas activés.
class DemoBanner extends StatelessWidget {
  const DemoBanner({super.key});
  @override
  Widget build(BuildContext context) {
    if (!Config.demoMode) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: K.warning,
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 12),
      child: const Text(
        'MODE DÉMONSTRATION — aucun paiement ni prêt réel',
        textAlign: TextAlign.center,
        style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 11),
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final String status;
  static const _labels = {
    'approved': 'Validé', 'pending': 'En attente', 'rejected': 'Refusé', 'more_info_required': 'Complément demandé', 'not_started': 'Non commencé',
    'open': 'Ouverte', 'pending_review': 'En examen', 'active': 'Actif', 'overdue': 'En retard', 'repaid': 'Remboursé', 'paid': 'Payée',
    'awaiting_disbursement': 'Décaissement en attente', 'proposed': 'Proposée', 'signed': 'Signé', 'accepted': 'Acceptée', 'defaulted': 'En défaut',
  };
  @override
  Widget build(BuildContext context) {
    final bad = {'rejected', 'overdue', 'defaulted'}.contains(status);
    final good = {'approved', 'active', 'repaid', 'paid', 'open', 'signed', 'accepted'}.contains(status);
    final c = bad ? K.danger : (good ? const Color(0xFF16804A) : K.warning);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: c.withValues(alpha: .15), borderRadius: BorderRadius.circular(99)),
      child: Text(_labels[status] ?? status, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }
}
