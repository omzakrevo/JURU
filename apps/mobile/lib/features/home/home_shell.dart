import 'package:flutter/material.dart';
import '../../widgets/demo_banner.dart';
import '../loans/loans_page.dart';
import '../market/market_page.dart';
import '../notifications/notifications_page.dart';
import '../profile/profile_page.dart';
import 'dashboard_page.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _i = 0;
  static const _pages = [DashboardPage(), MarketPage(), LoansPage(), NotificationsPage(), ProfilePage()];
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(child: Column(children: [const DemoBanner(), Expanded(child: _pages[_i])])),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _i,
          onDestinationSelected: (v) => setState(() => _i = v),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Accueil'),
            NavigationDestination(icon: Icon(Icons.search), label: 'Marché'),
            NavigationDestination(icon: Icon(Icons.description_outlined), label: 'Crédits'),
            NavigationDestination(icon: Icon(Icons.notifications_outlined), label: 'Alertes'),
            NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profil'),
          ],
        ),
      );
}
